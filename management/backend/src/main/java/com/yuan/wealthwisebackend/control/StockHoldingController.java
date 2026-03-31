package com.yuan.wealthwisebackend.control;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import com.yuan.wealthwisebackend.model.entity.StockHolding;
import com.yuan.wealthwisebackend.service.StockHoldingService;

import java.util.List;

@RestController
@RequestMapping("/api/stockholding")
public class StockHoldingController {

    @Resource
    private StockHoldingService stockHoldingService;

    // ==================== CREATE ====================

    /**
     * 新增持仓记录
     */
    @PostMapping
    public boolean add(@RequestBody StockHolding stockHolding) {
        return stockHoldingService.save(stockHolding);
    }

    /**
     * 批量新增持仓记录
     */
    @PostMapping("/batch")
    public boolean addBatch(@RequestBody List<StockHolding> list) {
        return stockHoldingService.saveBatch(list);
    }

    // ==================== READ ====================

    /**
     * 根据ID查询
     */
    @GetMapping("/{id}")
    public StockHolding getById(@PathVariable Long id) {
        return stockHoldingService.getById(id);
    }

    /**
     * 查询全部（支持按ticker筛选）
     */
    @GetMapping("/list")
    public List<StockHolding> list(@RequestParam(required = false) String ticker) {
        QueryWrapper<StockHolding> wrapper = new QueryWrapper<>();
        if (ticker != null && !ticker.isEmpty()) {
            wrapper.eq("ticker", ticker);
        }
        wrapper.orderByDesc("updated_at");
        return stockHoldingService.list(wrapper);
    }

    /**
     * 分页查询（支持按ticker筛选）
     */
    @GetMapping("/page")
    public Page<StockHolding> page(
            @RequestParam(defaultValue = "1") Integer current,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String ticker) {
        QueryWrapper<StockHolding> wrapper = new QueryWrapper<>();
        if (ticker != null && !ticker.isEmpty()) {
            wrapper.eq("ticker", ticker);
        }
        wrapper.orderByDesc("updated_at");
        return stockHoldingService.page(new Page<>(current, size), wrapper);
    }

    /**
     * 根据ticker查询持仓
     */
    @GetMapping("/ticker/{ticker}")
    public StockHolding getByTicker(@PathVariable String ticker) {
        QueryWrapper<StockHolding> wrapper = new QueryWrapper<>();
        wrapper.eq("ticker", ticker);
        return stockHoldingService.getOne(wrapper);
    }

    // ==================== UPDATE ====================

    /**
     * 根据ID更新
     */
    @PutMapping
    public boolean update(@RequestBody StockHolding stockHolding) {
        return stockHoldingService.updateById(stockHolding);
    }

    /**
     * 批量更新
     */
    @PutMapping("/batch")
    public boolean updateBatch(@RequestBody List<StockHolding> list) {
        return stockHoldingService.updateBatchById(list);
    }

    /**
     * 根据ticker更新持仓数量
     */
    @PutMapping("/ticker/{ticker}")
    public boolean updateByTicker(@PathVariable String ticker, @RequestParam Integer quantity) {
        QueryWrapper<StockHolding> wrapper = new QueryWrapper<>();
        wrapper.eq("ticker", ticker);
        StockHolding holding = new StockHolding();
        holding.setQuantity(quantity);
        return stockHoldingService.update(holding, wrapper);
    }

    // ==================== DELETE ====================

    /**
     * 根据ID删除
     */
    @DeleteMapping("/{id}")
    public boolean delete(@PathVariable Long id) {
        return stockHoldingService.removeById(id);
    }

    /**
     * 批量删除
     */
    @DeleteMapping("/batch")
    public boolean deleteBatch(@RequestParam List<Long> ids) {
        return stockHoldingService.removeByIds(ids);
    }

    /**
     * 根据ticker删除持仓
     */
    @DeleteMapping("/ticker/{ticker}")
    public boolean deleteByTicker(@PathVariable String ticker) {
        QueryWrapper<StockHolding> wrapper = new QueryWrapper<>();
        wrapper.eq("ticker", ticker);
        return stockHoldingService.remove(wrapper);
    }
}
