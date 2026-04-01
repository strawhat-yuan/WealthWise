package com.yuan.wealthwisebackend.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yuan.wealthwisebackend.model.entity.StockInfo;
import com.yuan.wealthwisebackend.service.StockInfoService;
import com.yuan.wealthwisebackend.mapper.StockInfoMapper;
import org.springframework.stereotype.Service;

/**
 * @author 49282
 * @description 针对表【stock_info】的数据库操作Service实现
 */
@Service
public class StockInfoServiceImpl extends ServiceImpl<StockInfoMapper, StockInfo>
    implements StockInfoService{

}
