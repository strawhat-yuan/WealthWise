package com.yuan.wealthwisebackend.control;


import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.yuan.wealthwisebackend.model.dto.StockPositionDTO;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import com.yuan.wealthwisebackend.service.StockTradeService;
import com.yuan.wealthwisebackend.model.entity.StockTrade;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/stocktrade")
public class StockTradeController {

    @Autowired
    private StockTradeService stockTradeService;

    /**
     * 新增交易记录
     */
    @PostMapping
    public boolean add(@RequestBody StockTrade stockTrade) {
        return stockTradeService.save(stockTrade);
    }

    /**
     * 批量新增交易记录
     */
    @PostMapping("/batch")
    public boolean addBatch(@RequestBody List<StockTrade> list) {
        return stockTradeService.saveBatch(list);
    }

    // ==================== READ ====================

    /**
     * 根据ID查询
     */
    @GetMapping("/{id}")
    public StockTrade getById(@PathVariable Long id) {
        return stockTradeService.getById(id);
    }

    /**
     * 查询全部（支持按ticker筛选）
     */
    @GetMapping("/list")
    public List<StockTrade> list(@RequestParam(required = false) String ticker) {
        QueryWrapper<StockTrade> wrapper = new QueryWrapper<>();
        if (ticker != null && !ticker.isEmpty()) {
            wrapper.eq("ticker", ticker);
        }
        wrapper.orderByDesc("ts");
        return stockTradeService.list(wrapper);
    }

    /**
     * 分页查询（支持按ticker筛选）
     */
    @GetMapping("/page")
    public Page<StockTrade> page(
            @RequestParam(defaultValue = "1") Integer current,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String ticker) {
        QueryWrapper<StockTrade> wrapper = new QueryWrapper<>();
        if (ticker != null && !ticker.isEmpty()) {
            wrapper.eq("ticker", ticker);
        }
        wrapper.orderByDesc("ts");
        return stockTradeService.page(new Page<>(current, size), wrapper);
    }

    /**
     * 根据ticker查询所有交易记录
     */
    @GetMapping("/ticker/{ticker}")
    public List<StockTrade> getByTicker(@PathVariable String ticker) {
        QueryWrapper<StockTrade> wrapper = new QueryWrapper<>();
        wrapper.eq("ticker", ticker).orderByDesc("ts");
        return stockTradeService.list(wrapper);
    }

    /**
     * 根据交易类型查询（BUY/SELL）
     */
    @GetMapping("/type/{tradeType}")
    public List<StockTrade> getByTradeType(@PathVariable String tradeType) {
        QueryWrapper<StockTrade> wrapper = new QueryWrapper<>();
        wrapper.eq("trade_type", tradeType).orderByDesc("ts");
        return stockTradeService.list(wrapper);
    }

    /**
     * 根据日期查询交易记录
     */
    @GetMapping("/date/{date}")
    public List<StockTrade> getByDate(@PathVariable String date) {
        QueryWrapper<StockTrade> wrapper = new QueryWrapper<>();
        wrapper.like("ts", date).orderByDesc("ts");
        return stockTradeService.list(wrapper);
    }

    /**
     * 条件查询（股票代码+交易类型）
     */
    @GetMapping("/filter")
    public List<StockTrade> getByFilter(
            @RequestParam String ticker,
            @RequestParam(required = false) String tradeType) {
        QueryWrapper<StockTrade> wrapper = new QueryWrapper<>();
        wrapper.eq("ticker", ticker);
        if (tradeType != null && !tradeType.isEmpty()) {
            wrapper.eq("trade_type", tradeType);
        }
        wrapper.orderByDesc("ts");
        return stockTradeService.list(wrapper);
    }

    // ==================== UPDATE ====================

    /**
     * 根据ID更新
     */
    @PutMapping
    public boolean update(@RequestBody StockTrade stockTrade) {
        return stockTradeService.updateById(stockTrade);
    }

    /**
     * 批量更新
     */
    @PutMapping("/batch")
    public boolean updateBatch(@RequestBody List<StockTrade> list) {
        return stockTradeService.updateBatchById(list);
    }

    // ==================== DELETE ====================

    /**
     * 根据ID删除
     */
    @DeleteMapping("/{id}")
    public boolean delete(@PathVariable Long id) {
        return stockTradeService.removeById(id);
    }

    /**
     * 批量删除
     */
    @DeleteMapping("/batch")
    public boolean deleteBatch(@RequestParam List<Long> ids) {
        return stockTradeService.removeByIds(ids);
    }

    @GetMapping("/position/{ticker}")
    public StockPositionDTO getPosition(
            @PathVariable String ticker,
            @RequestParam(required = false) BigDecimal currentPrice) {

        if (currentPrice != null) {
            return stockTradeService.getPositionWithSuggestion(ticker, currentPrice);
        } else {
            return stockTradeService.calculatePosition(ticker);
        }
    }

    /**
     * 获取所有持仓股票的成本（不含建议）
     */
    @GetMapping("/positions")
    public List<StockPositionDTO> getAllPositions() {
        return stockTradeService.calculateAllPositions();
    }
}
