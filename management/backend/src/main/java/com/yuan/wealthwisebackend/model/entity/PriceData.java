package com.yuan.wealthwisebackend.model.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Deprecated
public class PriceData {
    private List<Double> close;
    private List<Long> volume;
    private List<Double> low;
    private List<Double> open;
    private List<Double> high;
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private List<LocalDateTime> timestamp;
}