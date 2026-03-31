package com.yuan.wealthwisebackend.service;

import com.yuan.wealthwisebackend.model.dto.StockPriceData;
import com.yuan.wealthwisebackend.model.entity.StockPriceResponse;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
public class StockDataService {
    private static final String API_URL =
            "https://c4rm9elh30.execute-api.us-east-1.amazonaws.com/default/cachedPriceData";

    @Resource
    private RestTemplate restTemplate;

    public StockPriceData getStockData(String ticker) {
        String url = API_URL + "?ticker=" + ticker;
        log.info("请求股票数据: {}", url);

        StockPriceResponse response = restTemplate.getForObject(url, StockPriceResponse.class);

        if (response != null && response.getPrice_data() != null) {
            // 将响应数据转换到 StockPriceData
            StockPriceData data = new StockPriceData();
            data.setTicker(response.getTicker());
            data.setClose(response.getPrice_data().getClose());
            data.setVolume(response.getPrice_data().getVolume());
            data.setLow(response.getPrice_data().getLow());
            data.setOpen(response.getPrice_data().getOpen());
            data.setHigh(response.getPrice_data().getHigh());
            data.setTimestamp(response.getPrice_data().getTimestamp());

            // 日志输出...
            return data;
        }
        return null;
    }
}
