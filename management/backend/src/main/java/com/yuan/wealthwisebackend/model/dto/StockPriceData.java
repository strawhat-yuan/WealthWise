package com.yuan.wealthwisebackend.model.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class StockPriceData {

    /**
     * 股票代码，如 "TSLA"
     */
    private String ticker;

    /**
     * 收盘价数组（按时间顺序）
     */
    private List<Double> close;

    /**
     * 成交量数组
     */
    private List<Long> volume;

    /**
     * 最低价数组
     */
    private List<Double> low;

    /**
     * 开盘价数组
     */
    private List<Double> open;

    /**
     * 最高价数组
     */
    private List<Double> high;

    /**
     * 时间戳数组（5分钟粒度)
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private List<LocalDateTime> timestamp;
}