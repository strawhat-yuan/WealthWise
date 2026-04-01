package com.yuan.wealthwisebackend.control;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yuan.wealthwisebackend.model.dto.MarketDataDTO;
import com.yuan.wealthwisebackend.model.entity.StockPrice;
import com.yuan.wealthwisebackend.service.StockPriceService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
     * 根据股票代码和日期精准查询
     */
    @GetMapping("/detail")
    public StockPrice getDetail(
            @RequestParam String ticker,
            @RequestParam String date) {
        QueryWrapper<StockPrice> wrapper = new QueryWrapper<>();
        wrapper.eq("ticker", ticker).eq("ts", date);
        return stockPriceService.getOne(wrapper);
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

    /**
     * 获取所有可用的股票代码
     */
    @GetMapping("/tickers")
    public List<String> getAvailableTickers() {
        QueryWrapper<StockPrice> wrapper = new QueryWrapper<>();
        wrapper.select("distinct ticker");
        return stockPriceService.listObjs(wrapper, Object::toString);
    }

    /**
     * 获取所有可用的股票及其最新市场数据 (价格 + 24h 涨跌幅)
     */
    @GetMapping("/market/latest")
    public Map<String, MarketDataDTO> getLatestPrices() {
        List<String> tickers = getAvailableTickers();
        Map<String, MarketDataDTO> map = new HashMap<>();
        for (String t : tickers) {
            QueryWrapper<StockPrice> w = new QueryWrapper<>();
            // 取最后两条价格记录来计算涨跌幅
            w.eq("ticker", t).orderByDesc("ts").last("LIMIT 2");
            List<StockPrice> history = stockPriceService.list(w);
            if (history != null && history.size() > 0) {
                StockPrice latest = history.get(0);
                java.math.BigDecimal changePercent = java.math.BigDecimal.ZERO;
                if (history.size() > 1) {
                    StockPrice prev = history.get(1);
                    if (prev.getClose().compareTo(java.math.BigDecimal.ZERO) != 0) {
                        changePercent = latest.getClose().subtract(prev.getClose())
                                .divide(prev.getClose(), 4, RoundingMode.HALF_UP)
                                .multiply(new java.math.BigDecimal("100"));
                    }
                }
                map.put(t, new MarketDataDTO(latest.getClose(), changePercent));
            }
        }
        return map;
    }
}
