package com.yuan.wealthwisebackend.mapper;

import com.yuan.wealthwisebackend.model.entity.StockTrade;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
* @author 崔昊男
* @description 针对表【stock_trade】的数据库操作Mapper
* @createDate 2026-03-31 11:13:04
* @Entity com.yuan.wealthwisebackend.model.entity.StockTrade
*/
@Mapper
public interface StockTradeMapper extends BaseMapper<StockTrade> {

}




