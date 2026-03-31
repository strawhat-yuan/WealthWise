package com.yuan.wealthwisebackend.control;

import com.yuan.wealthwisebackend.model.dto.StockPriceData;
import com.yuan.wealthwisebackend.service.StockDataService;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stock")
@Deprecated
public class StockController {

    @Resource
    private StockDataService stockDataService;

    @GetMapping("/{ticker}")
    public StockPriceData getStockData(@PathVariable String ticker) {
        return stockDataService.getStockData(ticker);
    }
}
