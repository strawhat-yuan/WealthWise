package com.yuan.wealthwisebackend.mapper;

import com.yuan.wealthwisebackend.model.entity.StockHolding;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
* @author 崔昊男
* @description 针对表【stock_holding】的数据库操作Mapper
* @createDate 2026-03-31 11:13:16
* @Entity com.yuan.wealthwisebackend.model.entity.StockHolding
*/
@Mapper
public interface StockHoldingMapper extends BaseMapper<StockHolding> {

}




