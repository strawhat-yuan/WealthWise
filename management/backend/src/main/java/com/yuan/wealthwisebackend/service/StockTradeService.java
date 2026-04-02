package com.yuan.wealthwisebackend.service;

import com.yuan.wealthwisebackend.model.dto.StockPositionDTO;
import com.yuan.wealthwisebackend.model.entity.StockTrade;
import com.yuan.wealthwisebackend.model.entity.StockRealizedSummary;
import com.baomidou.mybatisplus.extension.service.IService;

import java.math.BigDecimal;
import java.util.List;

/**
* @author 崔昊男
* @description 针对表【stock_trade】的数据库操作Service
* @createDate 2026-03-31 11:13:04
*/
public interface StockTradeService extends IService<StockTrade> {
    /**
     * 计算某只股票的平均持货成本
     */
    StockPositionDTO calculatePosition(String ticker);

    /**
     * 计算所有有持仓股票的平均成本
     * @return
     */
    List<StockPositionDTO> calculateAllPositions();

    /**
     * 根据当前市场价格给出建议
     * @param ticker
     * @param currentPrice
     * @return
     */
    StockPositionDTO getPositionWithSuggestion(String ticker, BigDecimal currentPrice);

    /**
     * 保存交易并更新实盈汇总
     */
    boolean saveTrade(StockTrade stockTrade);

    /**
     * 获取所有标的的累计实盈汇总
     */
    List<StockRealizedSummary> getRealizedSummary();

    /**
     * 根据 ticker 删除实盈汇总记录
     */
    boolean deleteRealizedSummary(String ticker);
}
