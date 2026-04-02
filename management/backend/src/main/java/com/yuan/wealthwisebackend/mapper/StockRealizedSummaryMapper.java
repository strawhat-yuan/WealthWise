package com.yuan.wealthwisebackend.mapper;

import com.yuan.wealthwisebackend.model.entity.StockRealizedSummary;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
* @author 崔昊男
* @description 针对表【stock_realized_summary】的数据库操作Mapper
* @createDate 2026-04-02 13:09:00
* @Entity com.yuan.wealthwisebackend.model.entity.StockRealizedSummary
*/
@Mapper
public interface StockRealizedSummaryMapper extends BaseMapper<StockRealizedSummary> {

}
