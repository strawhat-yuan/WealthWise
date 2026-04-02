package com.yuan.wealthwisebackend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yuan.wealthwisebackend.model.dto.StockPositionDTO;
import com.yuan.wealthwisebackend.model.entity.StockTrade;
import com.yuan.wealthwisebackend.service.StockTradeService;
import com.yuan.wealthwisebackend.mapper.StockTradeMapper;
import com.yuan.wealthwisebackend.mapper.StockRealizedSummaryMapper;
import com.yuan.wealthwisebackend.model.entity.StockRealizedSummary;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
* @author 崔昊男
* @description 针对表【stock_trade】的数据库操作Service实现
* @createDate 2026-03-31 11:13:04
*/
@Service
public class StockTradeServiceImpl extends ServiceImpl<StockTradeMapper, StockTrade>
    implements StockTradeService{

    @Resource
    private StockRealizedSummaryMapper realizedSummaryMapper;

    @Override
    @Transactional
    public boolean saveTrade(StockTrade trade) {
        // 1. 如果是卖出，先计算本次卖出的 P&L (基于当前持仓成本)
        if ("SELL".equalsIgnoreCase(trade.getTradeType())) {
            StockPositionDTO currentPos = calculatePosition(trade.getTicker());
            if (currentPos != null && currentPos.getCurrentQuantity() >= trade.getQuantity()) {
                BigDecimal avgCost = currentPos.getAverageCost();
                BigDecimal profit = trade.getPrice().subtract(avgCost)
                        .multiply(new BigDecimal(trade.getQuantity()));

                // 2. 更新或插入累计实盈记录 (标的级别)
                QueryWrapper<StockRealizedSummary> wrapper = new QueryWrapper<>();
                wrapper.eq("ticker", trade.getTicker());
                StockRealizedSummary summary = realizedSummaryMapper.selectOne(wrapper);

                if (summary == null) {
                    summary = new StockRealizedSummary();
                    summary.setTicker(trade.getTicker());
                    summary.setCumulativePnl(profit);
                    realizedSummaryMapper.insert(summary);
                } else {
                    summary.setCumulativePnl(summary.getCumulativePnl().add(profit));
                    realizedSummaryMapper.updateById(summary);
                }
            }
        }

        // 3. 执行基础保存
        return save(trade);
    }

    @Override
    public List<StockRealizedSummary> getRealizedSummary() {
        return realizedSummaryMapper.selectList(null);
    }

    @Override
    public boolean deleteRealizedSummary(String ticker) {
        QueryWrapper<StockRealizedSummary> wrapper = new QueryWrapper<>();
        wrapper.eq("ticker", ticker);
        return realizedSummaryMapper.delete(wrapper) > 0;
    }

    /**
     * 获取某只股票的平均持仓成本
     * @param ticker
     * @return
     */
    @Override
    public StockPositionDTO calculatePosition(String ticker) {
        // 1. 获取该股票所有交易记录，按时间正序排列（FIFO）
        QueryWrapper<StockTrade> wrapper = new QueryWrapper<>();
        wrapper.eq("ticker", ticker).orderByAsc("ts");
        List<StockTrade> trades = list(wrapper);

        if (trades.isEmpty()) {
            return null;
        }

        // 2. 使用FIFO队列计算持仓
        // 队列中存储: [买入数量, 买入单价]
        LinkedList<BigDecimal[]> buyQueue = new LinkedList<>();
        BigDecimal totalCost = BigDecimal.ZERO;  // 当前持仓总成本
        int currentQty = 0;  // 当前持仓数量

        for (StockTrade trade : trades) {
            if ("BUY".equalsIgnoreCase(trade.getTradeType())) {
                // 买入：加入队列
                buyQueue.offer(new BigDecimal[]{
                        new BigDecimal(trade.getQuantity()),
                        trade.getPrice()
                });
                totalCost = totalCost.add(trade.getAmount());
                currentQty += trade.getQuantity();

            } else if ("SELL".equalsIgnoreCase(trade.getTradeType())) {
                // 卖出：按FIFO扣除
                int sellQty = trade.getQuantity();

                while (sellQty > 0 && !buyQueue.isEmpty()) {
                    BigDecimal[] buy = buyQueue.peek();
                    int buyQty = buy[0].intValue();
                    BigDecimal buyPrice = buy[1];

                    if (buyQty <= sellQty) {
                        // 这批全部卖完
                        totalCost = totalCost.subtract(buy[0].multiply(buyPrice));
                        currentQty -= buyQty;
                        sellQty -= buyQty;
                        buyQueue.poll(); // 移除
                    } else {
                        // 卖一部分
                        BigDecimal sold = new BigDecimal(sellQty);
                        totalCost = totalCost.subtract(sold.multiply(buyPrice));
                        currentQty -= sellQty;
                        buy[0] = buy[0].subtract(sold); // 更新剩余数量
                        sellQty = 0;
                    }
                }
            }
        }

        // 3. 构建返回结果
        StockPositionDTO dto = new StockPositionDTO();
        dto.setTicker(ticker);
        dto.setCurrentQuantity(currentQty);
        dto.setTotalCost(totalCost);

        if (currentQty > 0) {
            dto.setAverageCost(totalCost.divide(
                    new BigDecimal(currentQty), 4, RoundingMode.HALF_UP
            ));
        } else {
            dto.setAverageCost(BigDecimal.ZERO);
        }

        return dto;
    }

    @Override
    public List<StockPositionDTO> calculateAllPositions() {
        // 获取所有交易过的股票代码
        List<StockTrade> allTrades = list();
        Set<String> tickers = new HashSet<>();
        for (StockTrade trade : allTrades) {
            tickers.add(trade.getTicker());
        }

        List<StockPositionDTO> positions = new ArrayList<>();
        for (String ticker : tickers) {
            StockPositionDTO pos = calculatePosition(ticker);
            if (pos != null && pos.getCurrentQuantity() > 0) {
                positions.add(pos);
            }
        }
        return positions;
    }

    /**
     * 根据当前市场价格给出建议
     */
    @Override
    public StockPositionDTO getPositionWithSuggestion(String ticker, BigDecimal currentPrice) {
        StockPositionDTO dto = calculatePosition(ticker);
        if (dto == null || dto.getCurrentQuantity() == 0) {
            return dto;
        }

        // 计算盈亏比例
        BigDecimal avgCost = dto.getAverageCost();
        BigDecimal profitRate = currentPrice.subtract(avgCost)
                .divide(avgCost, 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal(100));

        // 建议逻辑
        if (profitRate.compareTo(new BigDecimal(20)) >= 0) {
            dto.setSuggestion("SELL");
            dto.setSuggestionReason(String.format(
                    "当前价格 %.2f 较成本价 %.2f 盈利 %.2f%%，建议止盈卖出",
                    currentPrice, avgCost, profitRate
            ));
        } else if (profitRate.compareTo(new BigDecimal(-10)) <= 0) {
            dto.setSuggestion("BUY");
            dto.setSuggestionReason(String.format(
                    "当前价格 %.2f 较成本价 %.2f 亏损 %.2f%%，建议逢低补仓",
                    currentPrice, avgCost, profitRate.abs()
            ));
        } else {
            dto.setSuggestion("HOLD");
            dto.setSuggestionReason(String.format(
                    "当前价格 %.2f 较成本价 %.2f %s %.2f%%，建议继续持有观望",
                    currentPrice, avgCost,
                    profitRate.compareTo(BigDecimal.ZERO) >= 0 ? "盈利" : "亏损",
                    profitRate.abs()
            ));
        }

        return dto;
    }
}




