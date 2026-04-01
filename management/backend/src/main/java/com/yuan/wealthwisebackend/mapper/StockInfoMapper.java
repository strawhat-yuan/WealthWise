package com.yuan.wealthwisebackend.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yuan.wealthwisebackend.model.entity.StockInfo;
import org.apache.ibatis.annotations.Mapper;

/**
 * @author 49282
 * @description 针对表【stock_info】的数据库操作Mapper
 */
@Mapper
public interface StockInfoMapper extends BaseMapper<StockInfo> {

}
