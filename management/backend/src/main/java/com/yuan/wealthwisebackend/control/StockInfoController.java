package com.yuan.wealthwisebackend.control;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.yuan.wealthwisebackend.model.entity.StockInfo;
import com.yuan.wealthwisebackend.service.StockInfoService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stockinfo")
public class StockInfoController {

    @Resource
    private StockInfoService stockInfoService;

    /**
     * 获取所有股票元数据
     */
    @GetMapping("/list")
    public List<StockInfo> list() {
        return stockInfoService.list();
    }

    /**
     * 获取股票元数据映射 (Ticker -> StockInfo)
     */
    @GetMapping("/map")
    public Map<String, StockInfo> getStockInfoMap() {
        List<StockInfo> list = stockInfoService.list();
        return list.stream().collect(Collectors.toMap(StockInfo::getTicker, s -> s));
    }

    /**
     * 新增/更新股票元数据
     */
    @PostMapping("/save")
    public boolean save(@RequestBody StockInfo stockInfo) {
        return stockInfoService.saveOrUpdate(stockInfo);
    }
}
