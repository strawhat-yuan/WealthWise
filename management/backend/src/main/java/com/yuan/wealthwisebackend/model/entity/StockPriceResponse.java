package com.yuan.wealthwisebackend.model.entity;

import lombok.Data;

@Data
@Deprecated
public class StockPriceResponse {
    private String ticker;
    private PriceData price_data;
}
