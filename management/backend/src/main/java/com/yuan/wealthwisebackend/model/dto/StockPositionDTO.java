package com.yuan.wealthwisebackend.model.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class StockPositionDTO {
    /** 股票代码 */
    private String ticker;

    /** 当前持仓数量 */
    private int currentQuantity;

    /** 平均持货成本 */
    private BigDecimal averageCost;

    /** 当前总成本 */
    private BigDecimal totalCost;

    /** 建议: BUY/SELL/HOLD */
    private String suggestion;

    /** 建议说明 */
    private String suggestionReason;
}
