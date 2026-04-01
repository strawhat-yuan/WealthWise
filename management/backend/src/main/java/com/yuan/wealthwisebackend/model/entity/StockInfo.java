package com.yuan.wealthwisebackend.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;

/**
 * 股票详情信息
 * @TableName stock_info
 */
@TableName(value ="stock_info")
@Data
public class StockInfo implements Serializable {
    /**
     * 主键ID
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 股票代码
     */
    private String ticker;

    /**
     * 股票名称
     */
    private String name;

    /**
     * 行业板块
     */
    private String sector;

    /**
     * 市值
     */
    private Long marketCap;

    /**
     * 创建时间
     */
    private Date createdAt;

    private static final long serialVersionUID = 1L;
}
