package com.yuan.wealthwisebackend.control;


import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yuan.wealthwisebackend.model.entity.StockPrice;
import com.yuan.wealthwisebackend.service.StockPriceService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stockprice")
public class StockPriceController {

    @Resource
    private StockPriceService stockPriceService;

    /**
     * 新增股价数据
     */
    @PostMapping("/addstockprice")
    public boolean add(@RequestBody StockPrice stockPrice) {
        return stockPriceService.save(stockPrice);
    }

    /**
     * 批量新增
     */
    @PostMapping("/addbatchstockprice")
    public boolean addBatch(@RequestBody List<StockPrice> list) {
        return stockPriceService.saveBatch(list);
    }

    /**
     * 根据ID查询
     */
    @GetMapping("/{id}")
    public StockPrice getById(@PathVariable Long id) {
        return stockPriceService.getById(id);
    }


    /**
     * 查询全部
     */
    @GetMapping("/list")
    public List<StockPrice> list() {
        return stockPriceService.list();
    }

    /**
     * 分页查询
     */
    @GetMapping("/page")
    public Page<StockPrice> page(
            @RequestParam(defaultValue = "1") Integer current,
            @RequestParam(defaultValue = "10") Integer size) {
        return stockPriceService.page(new Page<>(current, size));
    }

    /**
     * 根据股票代码查询历史数据
     */
    @GetMapping("/ticker/{ticker}")
    public List<StockPrice> getByTicker(@PathVariable String ticker) {
        QueryWrapper<StockPrice> wrapper = new QueryWrapper<>();
        wrapper.eq("ticker", ticker).orderByAsc("ts");
        return stockPriceService.list(wrapper);
    }

    /**
     * 根据日期查询所有股票
     */
    @GetMapping("/date/{date}")
    public List<StockPrice> getByDate(@PathVariable String date) {
        QueryWrapper<StockPrice> wrapper = new QueryWrapper<>();
        wrapper.eq("ts", date);
        return stockPriceService.list(wrapper);
    }

    /**
     * 根据类型查询（股票/债券）
     */
    @GetMapping("/type/{type}")
    public List<StockPrice> getByType(@PathVariable String type) {
        QueryWrapper<StockPrice> wrapper = new QueryWrapper<>();
        wrapper.eq("type", type);
        return stockPriceService.list(wrapper);
    }

    /**
     * 条件查询（股票代码+日期范围）
     */
    @GetMapping("/range")
    public List<StockPrice> getByRange(
            @RequestParam String ticker,
            @RequestParam String startDate,
            @RequestParam String endDate) {
        QueryWrapper<StockPrice> wrapper = new QueryWrapper<>();
        wrapper.eq("ticker", ticker)
                .between("ts", startDate, endDate)
                .orderByAsc("ts");
        return stockPriceService.list(wrapper);
    }

    /**
     * 根据ID更新
     */
    @PutMapping("/update")
    public boolean update(@RequestBody StockPrice stockPrice) {
        return stockPriceService.updateById(stockPrice);
    }

    /**
     * 根据ID删除
     */
    @DeleteMapping("/{id}")
    public boolean delete(@PathVariable Long id) {
        return stockPriceService.removeById(id);
    }

    /**
     * 批量删除
     */
    @DeleteMapping("/batch")
    public boolean deleteBatch(@RequestParam List<Long> ids) {
        return stockPriceService.removeByIds(ids);
    }



}
