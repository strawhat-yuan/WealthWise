package com.yuan.wealthwisebackend.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MarketDataDTO {
    /**
     * 最新收盘价
     */
    private BigDecimal price;

    /**
     * 24小时涨跌幅 (百分比)
     */
    private BigDecimal changePercent;
}
