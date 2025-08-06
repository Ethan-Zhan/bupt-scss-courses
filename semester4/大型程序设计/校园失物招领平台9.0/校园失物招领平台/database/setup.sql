-- =============================================================================
-- 校园失物招领平台数据库初始化脚本
--
-- 作用:
-- 1. 如果旧数据库 'LostAndFoundDB' 存在，则将其完全删除，以确保一个干净的开始。
-- 2. 创建一个全新的 'LostAndFoundDB' 数据库。
-- 3. 在新库中创建所有核心业务表结构，包括用户表、物品表、通知表和消息表。
-- 4. 插入初始的管理员、志愿者和普通用户数据。
-- 5. (核心) 插入39对已经精确对齐的失物与拾物数据，所有物品状态均为'未找到'，
--    为后续的AI匹配和手动匹配功能提供充足的测试样本。
-- =============================================================================

-- 切换到 master 数据库上下文，以执行数据库级别的操作
USE master;
GO

-- --- 1. 删除旧数据库 (如果存在) ---
-- 检查名为 'LostAndFoundDB' 的数据库是否存在
IF DB_ID('LostAndFoundDB') IS NOT NULL
BEGIN
    -- 如果存在，则先将数据库设置为单用户模式，以断开所有现有连接
    ALTER DATABASE LostAndFoundDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    -- 删除数据库
    DROP DATABASE LostAndFoundDB;
    -- 打印日志信息
    PRINT '旧数据库 LostAndFoundDB 已成功删除。';
END
GO

-- --- 2. 创建新数据库 ---
CREATE DATABASE LostAndFoundDB;
PRINT '新数据库 LostAndFoundDB 已成功创建。';
GO

-- --- 3. 切换到新数据库上下文 ---
USE LostAndFoundDB;
GO

-- =============================================================================
--                            表结构创建
-- =============================================================================

-- --- 3.1 用户表 (Users) ---
-- 存储平台所有用户的信息
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),           -- 用户ID, 自增主键
    Username NVARCHAR(50) UNIQUE NOT NULL,          -- 用户名, 唯一且不为空
    Password NVARCHAR(255) NOT NULL,                -- 密码字段 (v8.2中已弃用, 为兼容旧结构保留)
    PasswordHash NVARCHAR(256) NOT NULL,            -- 哈希后的密码 (SHA-256), 用于安全验证
    UserRole NVARCHAR(20) NOT NULL CHECK (UserRole IN (N'普通用户', N'志愿者', N'管理员')), -- 用户角色, 限制输入
    Email NVARCHAR(100) UNIQUE NOT NULL,            -- 邮箱, 唯一且不为空, 用于通知和密码重置
    RegistrationDate DATETIME DEFAULT GETDATE(),    -- 注册时间, 默认为当前时间
    ResetCode NVARCHAR(10) NULL,                    -- 密码重置验证码
    ResetCodeExpiry DATETIME NULL                   -- 验证码过期时间
);
PRINT '表 Users 已创建。';
GO

-- --- 3.2 物品表 (Items) ---
-- 存储所有的失物和拾物信息
CREATE TABLE Items (
    ItemID NVARCHAR(10) PRIMARY KEY,                -- 物品ID, 主键 (如 'L100000001')
    UserID INT FOREIGN KEY REFERENCES Users(UserID) ON DELETE SET NULL, -- 发布者ID, 外键关联Users表, 用户删除后设为NULL
    ItemType NVARCHAR(10) NOT NULL CHECK (ItemType IN ('Lost', 'Found')), -- 物品类型: Lost(失物), Found(拾物)
    ItemName NVARCHAR(100) NOT NULL,                -- 物品名称
    Description NVARCHAR(MAX),                      -- 详细描述
    Category NVARCHAR(50),                          -- 物品分类
    Color NVARCHAR(20),                             -- 颜色
    Location NVARCHAR(200),                         -- 丢失/拾获地点
    EventTime DATETIME,                             -- 丢失/拾获时间
    PostTime DATETIME DEFAULT GETDATE(),            -- 信息发布时间
    ImagePath NVARCHAR(255),                        -- 物品图片路径
    ItemStatus NVARCHAR(20) NOT NULL DEFAULT N'未找到' CHECK (ItemStatus IN (N'未找到', N'正在联系中', N'已找回', N'已删除')), -- 物品状态
    MatchItemID NVARCHAR(10) NULL                   -- 匹配到的物品ID (用于建立失物和拾物的关联)
);
PRINT '表 Items 已创建。';
GO

-- --- 3.3 通知表 (Notifications) ---
-- 存储发送给用户的系统通知
CREATE TABLE Notifications (
    NotificationID INT PRIMARY KEY IDENTITY(1,1),   -- 通知ID, 自增主键
    UserID INT FOREIGN KEY REFERENCES Users(UserID) ON DELETE CASCADE, -- 接收通知的用户ID, 用户删除时级联删除其通知
    Message NVARCHAR(MAX) NOT NULL,                 -- 通知内容
    IsRead BIT NOT NULL DEFAULT 0,                  -- 是否已读 (0: 未读, 1: 已读)
    CreationTime DATETIME DEFAULT GETDATE(),        -- 通知创建时间
    NotificationType NVARCHAR(20) NOT NULL CHECK (NotificationType IN ('General', 'Match', 'Claim', 'NewMessage')), -- 通知类型
    RelatedItemID_1 NVARCHAR(10) NULL,              -- 关联的物品ID 1 (例如, 失物ID)
    RelatedItemID_2 NVARCHAR(10) NULL               -- 关联的物品ID 2 (例如, 拾物ID)
);
PRINT '表 Notifications 已创建。';
GO

-- --- 3.4 对话消息表 (Messages) ---
-- 存储用户之间的私信聊天记录
CREATE TABLE Messages (
    MessageID INT PRIMARY KEY IDENTITY(1,1),        -- 消息ID, 自增主key
    SenderID INT NOT NULL,                          -- 发送者ID
    ReceiverID INT,                                 -- 接收者ID
    LostItemID NVARCHAR(10) NOT NULL,               -- 关联的失物ID
    FoundItemID NVARCHAR(10) NOT NULL,              -- 关联的拾物ID
    Content NVARCHAR(MAX) NOT NULL,                 -- 消息内容 (可以是文本或图片路径)
    SentTime DATETIME DEFAULT GETDATE(),            -- 发送时间
    IsRead BIT NOT NULL DEFAULT 0                   -- 是否已读
);
PRINT '表 Messages 已创建。';
GO

-- =============================================================================
--                            初始数据插入
-- =============================================================================

-- --- 4.1 插入初始用户 ---
INSERT INTO Users (Username, Password, PasswordHash, UserRole, Email) VALUES
(N'admin', N'admin123', N'240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', N'管理员', 'admin@school.com'),
(N'volunteer1', N'volunteer123', N'25a21eab5feca60534fc732ff65e27984b61e43d0c7a4614b9710cd01456c37a', N'志愿者', 'volunteer1@school.com'),
(N'user1', N'11111111', N'ee79976c9380d5e337fc1c095ece8c8f22f91f306ceeb161fa51fecede2c4ba1', N'普通用户', 'user1@school.com'),
(N'user2', N'22222222', N'33a7d3da476a32ac237b3f603a1be62fad00299e0d4b5a8db8d913104edec629', N'普通用户', 'user2@school.com'),
(N'user3', N'33333333', N'afb47e00531153e93808589e43d02c11f6398c5bc877f7924cebca8211c8dd18', N'普通用户', 'user3@school.com'),
(N'volunteer2', N'volunteer456', N'66276e7280fc7c734d9afc08ac94b646f042d50af0ee4c83cd3a8d2b733b2a75', N'志愿者', 'volunteer2@school.com');
PRINT '初始用户数据已插入。';
GO

-- --- 4.2 插入39对已对齐的、待匹配的物品数据 ---
-- 所有物品状态默认为 '未找到'
-- 失物(Lost)的数据已根据对应的拾物(Found)进行了精确对齐, 便于测试匹配功能

-- 物品对 1-19
INSERT INTO Items (UserID, ItemID, ItemType, ItemName, Category, Color, Location, Description, EventTime, ImagePath) VALUES
-- 失物 (Lost)
(3, 'L100000001', 'Lost', N'一个球', N'其他', N'多色', N'西土城校区：体育场', N'在体育场丢了一个球，失主请联系。', GETDATE()-1, NULL),
(4, 'L100000002', 'Lost', N'一把吉他', N'其他', N'木色', N'沙河校区：学活', N'在学生活动中心丢了一把吉他。', GETDATE()-2, NULL),
(5, 'L100000003', 'Lost', N'一袋水果', N'其他', N'多色', N'沙河校区：南区食堂', N'在食堂餐桌上丢的，还很新鲜。', GETDATE()-3, NULL),
(3, 'L100000004', 'Lost', N'一条裤子', N'衣物', N'蓝色', N'西土城校区：学十一公寓', N'在公寓楼下丢的。', GETDATE()-4, NULL),
(4, 'L100000005', 'Lost', N'一顶帽子', N'衣物', N'黑色', N'沙河校区：运动场', N'在操场看台丢的。', GETDATE()-5, NULL),
(5, 'L100000006', 'Lost', N'一个哑铃', N'其他', N'银色', N'沙河校区：教学实验综合楼', N'在健身房角落丢的。', GETDATE()-6, NULL),
(3, 'L100000007', 'Lost', N'一个充电器', N'电子产品', N'白色', N'西土城校区：图书馆', N'在图书馆座位上丢的。', GETDATE()-7, NULL),
(4, 'L100000008', 'Lost', N'一个吹风机', N'电子产品', N'粉色', N'沙河校区：雁北园A B C D1宿舍楼', N'在公共卫生间丢的。', GETDATE()-8, NULL),
(5, 'L100000009', 'Lost', N'一支笔', N'书籍', N'黑色', N'西土城校区：教一楼', N'在教室地上丢的。', GETDATE()-9, NULL),
(3, 'L100000010', 'Lost', N'一根数据线', N'电子产品', N'白色', N'沙河校区：智工楼', N'在实验室丢的。', GETDATE()-10, NULL),
(4, 'L100000011', 'Lost', N'一双鞋子', N'衣物', N'白色', N'西土城校区：体育馆', N'在体育馆更衣室丢的。', GETDATE()-11, NULL),
(5, 'L100000012', 'Lost', N'一个行李箱', N'其他', N'蓝色', N'沙河校区：西门', N'在校门口丢的，无人看管。', GETDATE()-12, NULL),
(3, 'L100000013', 'Lost', N'一块手表', N'电子产品', N'黑色', N'西土城校区：科研楼', N'在楼道丢的。', GETDATE()-13, NULL),
(4, 'L100000014', 'Lost', N'一个玩具', N'其他', N'黄色', N'沙河校区：理学院', N'在学院草坪上丢的。', GETDATE()-14, NULL),
(5, 'L100000015', 'Lost', N'一个台灯', N'电子产品', N'白色', N'西土城校区：学九公寓', N'在公寓自习室丢的。', GETDATE()-15, NULL),
(3, 'L100000016', 'Lost', N'一个手办', N'其他', N'多色', N'沙河校区：S6宿舍楼', N'在宿舍楼下丢的。', GETDATE()-1, NULL),
(4, 'L100000017', 'Lost', N'沐浴露和洗发水', N'其他', N'透明', N'西土城校区：学八公寓', N'在公共浴室丢的。', GETDATE()-2, NULL),
(5, 'L100000018', 'Lost', N'一个平板电脑', N'电子产品', N'深空灰', N'沙河校区：公共教学楼', N'在教室丢的。', GETDATE()-3, NULL),
(3, 'L100000019', 'Lost', N'一套餐具', N'其他', N'银色', N'西土城校区：综合食堂', N'在食堂丢的。', GETDATE()-4, NULL),

-- 拾物 (Found)
(5, 'F200000001', 'Found', N'一个球', N'其他', N'多色', N'西土城校区：体育场', N'在体育场捡到了一个球，失主请联系。', GETDATE()-1, 'uploads/sample1.jpg'),
(3, 'F200000002', 'Found', N'一把吉他', N'其他', N'木色', N'沙河校区：学活', N'在学生活动中心捡到一把吉他。', GETDATE()-2, 'uploads/sample2.jpg'),
(4, 'F200000003', 'Found', N'一袋水果', N'其他', N'多色', N'沙河校区：南区食堂', N'在食堂餐桌上发现的，还很新鲜。', GETDATE()-3, 'uploads/sample3.jpg'),
(5, 'F200000004', 'Found', N'一条裤子', N'衣物', N'蓝色', N'西土城校区：学十一公寓', N'在公寓楼下发现的。', GETDATE()-4, 'uploads/sample4.jpg'),
(3, 'F200000005', 'Found', N'一顶帽子', N'衣物', N'黑色', N'沙河校区：运动场', N'在操场看台捡到的。', GETDATE()-5, 'uploads/sample5.jpg'),
(4, 'F200000006', 'Found', N'一个哑铃', N'其他', N'银色', N'沙河校区：教学实验综合楼', N'在健身房角落发现的。', GETDATE()-6, 'uploads/sample6.jpg'),
(5, 'F200000007', 'Found', N'一个充电器', N'电子产品', N'白色', N'西土城校区：图书馆', N'在图书馆座位上捡到的。', GETDATE()-7, 'uploads/sample7.jpg'),
(3, 'F200000008', 'Found', N'一个吹风机', N'电子产品', N'粉色', N'沙河校区：雁北园A B C D1宿舍楼', N'在公共卫生间捡到的。', GETDATE()-8, 'uploads/sample8.jpg'),
(4, 'F200000009', 'Found', N'一支笔', N'书籍', N'黑色', N'西土城校区：教一楼', N'在教室地上捡到的。', GETDATE()-9, 'uploads/sample9.jpg'),
(5, 'F200000010', 'Found', N'一根数据线', N'电子产品', N'白色', N'沙河校区：智工楼', N'在实验室捡到的。', GETDATE()-10, 'uploads/sample10.jpg'),
(3, 'F200000011', 'Found', N'一双鞋子', N'衣物', N'白色', N'西土城校区：体育馆', N'在体育馆更衣室发现的。', GETDATE()-11, 'uploads/sample11.jpg'),
(4, 'F200000012', 'Found', N'一个行李箱', N'其他', N'蓝色', N'沙河校区：西门', N'在校门口发现的，无人看管。', GETDATE()-12, 'uploads/sample12.jpg'),
(5, 'F200000013', 'Found', N'一块手表', N'电子产品', N'黑色', N'西土城校区：科研楼', N'在楼道捡到的。', GETDATE()-13, 'uploads/sample13.jpg'),
(3, 'F200000014', 'Found', N'一个玩具', N'其他', N'黄色', N'沙河校区：理学院', N'在学院草坪上发现的。', GETDATE()-14, 'uploads/sample14.jpg'),
(4, 'F200000015', 'Found', N'一个台灯', N'电子产品', N'白色', N'西土城校区：学九公寓', N'在公寓自习室捡到的。', GETDATE()-15, 'uploads/sample15.jpg'),
(5, 'F200000016', 'Found', N'一个手办', N'其他', N'多色', N'沙河校区：S6宿舍楼', N'在宿舍楼下捡到的。', GETDATE()-1, 'uploads/sample16.jpg'),
(3, 'F200000017', 'Found', N'沐浴露和洗发水', N'其他', N'透明', N'西土城校区：学八公寓', N'在公共浴室捡到的。', GETDATE()-2, 'uploads/sample17.jpg'),
(4, 'F200000018', 'Found', N'一个平板电脑', N'电子产品', N'深空灰', N'沙河校区：公共教学楼', N'在教室捡到的。', GETDATE()-3, 'uploads/sample18.jpg'),
(5, 'F200000019', 'Found', N'一套餐具', N'其他', N'银色', N'西土城校区：综合食堂', N'在食堂捡到的。', GETDATE()-4, 'uploads/sample19.jpg');

-- 物品对 20-39
INSERT INTO Items (UserID, ItemID, ItemType, ItemName, Category, Color, Location, Description, EventTime, ImagePath) VALUES
-- 失物 (Lost)
(4, 'L100000020', 'Lost', N'一件衣服', N'衣物', N'白色', N'沙河校区：运动场', N'在操场上丢的。', GETDATE()-5, NULL),
(5, 'L100000021', 'Lost', N'一本书', N'书籍', N'多色', N'西土城校区：图书馆', N'在图书馆丢的。', GETDATE()-6, NULL),
(3, 'L100000022', 'Lost', N'一个书包', N'其他', N'黑色', N'沙河校区：S3工程实验楼', N'在实验室丢的。', GETDATE()-7, NULL),
(4, 'L100000023', 'Lost', N'一部手机', N'电子产品', N'蓝色', N'西土城校区：科学会堂', N'在会堂丢的。', GETDATE()-8, NULL),
(5, 'L100000024', 'Lost', N'一份早餐', N'其他', N'多色', N'沙河校区：学生食堂', N'在食堂丢的。', GETDATE()-9, NULL),
(3, 'L100000025', 'Lost', N'一个水瓶', N'其他', N'透明', N'西土城校区：教四楼', N'在教室丢的。', GETDATE()-10, NULL),
(4, 'L100000026', 'Lost', N'一台笔记本电脑', N'电子产品', N'银色', N'沙河校区：图书馆', N'在图书馆丢的。', GETDATE()-11, NULL),
(5, 'L100000027', 'Lost', N'一个篮球', N'其他', N'橙色', N'西土城校区：篮球场', N'在篮球场丢的。', GETDATE()-12, NULL),
(3, 'L100000028', 'Lost', N'一把雨伞', N'其他', N'黑色', N'沙河校区：数媒楼', N'在教学楼门口丢的。', GETDATE()-13, NULL),
(4, 'L100000029', 'Lost', N'一条项链', N'其他', N'金色', N'西土城校区：学生活动中心', N'在活动中心丢的。', GETDATE()-14, NULL),
(5, 'L100000030', 'Lost', N'一条围巾', N'衣物', N'格子', N'沙河校区：综合办公楼', N'在办公楼丢的。', GETDATE()-15, NULL),
(3, 'L100000031', 'Lost', N'一副眼镜', N'其他', N'黑色', N'西土城校区：教三楼', N'在教室丢的。', GETDATE()-1, NULL),
(4, 'L100000032', 'Lost', N'一本护照', N'证件', N'蓝色', N'沙河校区：东配楼', N'在教学楼丢的。', GETDATE()-2, NULL),
(5, 'L100000033', 'Lost', N'一本结婚证', N'证件', N'红色', N'沙河校区：网安楼', N'在网安楼丢的。', GETDATE()-3, NULL),
(3, 'L100000034', 'Lost', N'一个充电宝', N'电子产品', N'黑色', N'西土城校区：学五公寓', N'在公寓楼下丢的。', GETDATE()-4, NULL),
(4, 'L100000035', 'Lost', N'一个钱包', N'证件', N'棕色', N'沙河校区：快递驿站', N'在快递站丢的。', GETDATE()-5, NULL),
(5, 'L100000036', 'Lost', N'一串钥匙', N'钥匙', N'银色', N'西土城校区：学三公寓', N'在公寓楼道丢的。', GETDATE()-6, NULL),
(3, 'L100000037', 'Lost', N'一台相机', N'电子产品', N'黑色', N'沙河校区：医务室', N'在医务室丢的。', GETDATE()-7, NULL),
(4, 'L100000038', 'Lost', N'一个快递', N'其他', N'多色', N'西土城校区：快递站', N'在快递站丢的。', GETDATE()-8, NULL),
(4, 'L100000039', 'Lost', N'一副耳塞', N'电子产品', N'白色', N'沙河校区：S5宿舍楼', N'在宿舍楼丢的。', GETDATE()-9, NULL),

-- 拾物 (Found)
(3, 'F200000020', 'Found', N'一件衣服', N'衣物', N'白色', N'沙河校区：运动场', N'在操场上捡到的。', GETDATE()-5, 'uploads/sample20.jpg'),
(4, 'F200000021', 'Found', N'一本书', N'书籍', N'多色', N'西土城校区：图书馆', N'在图书馆捡到的。', GETDATE()-6, 'uploads/sample21.jpg'),
(5, 'F200000022', 'Found', N'一个书包', N'其他', N'黑色', N'沙河校区：S3工程实验楼', N'在实验室捡到的。', GETDATE()-7, 'uploads/sample22.jpg'),
(3, 'F200000023', 'Found', N'一部手机', N'电子产品', N'蓝色', N'西土城校区：科学会堂', N'在会堂捡到的。', GETDATE()-8, 'uploads/sample23.jpg'),
(4, 'F200000024', 'Found', N'一份早餐', N'其他', N'多色', N'沙河校区：学生食堂', N'在食堂捡到的。', GETDATE()-9, 'uploads/sample24.jpg'),
(5, 'F200000025', 'Found', N'一个水瓶', N'其他', N'透明', N'西土城校区：教四楼', N'在教室捡到的。', GETDATE()-10, 'uploads/sample25.jpg'),
(3, 'F200000026', 'Found', N'一台笔记本电脑', N'电子产品', N'银色', N'沙河校区：图书馆', N'在图书馆捡到的。', GETDATE()-11, 'uploads/sample26.jpg'),
(4, 'F200000027', 'Found', N'一个篮球', N'其他', N'橙色', N'西土城校区：篮球场', N'在篮球场捡到的。', GETDATE()-12, 'uploads/sample27.jpg'),
(5, 'F200000028', 'Found', N'一把雨伞', N'其他', N'黑色', N'沙河校区：数媒楼', N'在教学楼门口捡到的。', GETDATE()-13, 'uploads/sample28.jpg'),
(3, 'F200000029', 'Found', N'一条项链', N'其他', N'金色', N'西土城校区：学生活动中心', N'在活动中心捡到的。', GETDATE()-14, 'uploads/sample29.jpg'),
(4, 'F200000030', 'Found', N'一条围巾', N'衣物', N'格子', N'沙河校区：综合办公楼', N'在办公楼捡到的。', GETDATE()-15, 'uploads/sample30.jpg'),
(5, 'F200000031', 'Found', N'一副眼镜', N'其他', N'黑色', N'西土城校区：教三楼', N'在教室捡到的。', GETDATE()-1, 'uploads/sample31.jpg'),
(3, 'F200000032', 'Found', N'一本护照', N'证件', N'蓝色', N'沙河校区：东配楼', N'在教学楼捡到的。', GETDATE()-2, 'uploads/sample32.jpg'),
(4, 'F200000033', 'Found', N'一本结婚证', N'证件', N'红色', N'沙河校区：网安楼', N'在网安楼捡到的。', GETDATE()-3, 'uploads/sample33.jpg'),
(5, 'F200000034', 'Found', N'一个充电宝', N'电子产品', N'黑色', N'西土城校区：学五公寓', N'在公寓楼下捡到的。', GETDATE()-4, 'uploads/sample34.jpg'),
(3, 'F200000035', 'Found', N'一个钱包', N'证件', N'棕色', N'沙河校区：快递驿站', N'在快递站捡到的。', GETDATE()-5, 'uploads/sample35.jpg'),
(4, 'F200000036', 'Found', N'一串钥匙', N'钥匙', N'银色', N'西土城校区：学三公寓', N'在公寓楼道捡到的。', GETDATE()-6, 'uploads/sample36.jpg'),
(5, 'F200000037', 'Found', N'一台相机', N'电子产品', N'黑色', N'沙河校区：医务室', N'在医务室捡到的。', GETDATE()-7, 'uploads/sample37.jpg'),
(3, 'F200000038', 'Found', N'一个快递', N'其他', N'多色', N'西土城校区：快递站', N'在快递站捡到的。', GETDATE()-8, 'uploads/sample38.jpg'),
(4, 'F200000039', 'Found', N'一副耳塞', N'电子产品', N'白色', N'沙河校区：S5宿舍楼', N'在宿舍楼捡到的。', GETDATE()-9, 'uploads/sample39.jpg');

PRINT '39对已对齐的示例物品数据已插入。';
GO

-- --- 5. 结束 ---
PRINT '数据库初始化完成！所有表结构和测试数据已成功装载。';
GO