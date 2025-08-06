clc; clear;

% 创建一个新的图形窗口，标题为"图片相似度比较"，窗口大小为1200x2000
figure('NumberTitle', 'off', 'Name', '图片相似度比较', 'Position', [100, 100, 1200, 2000]);

key = 1234;    
tau = 0.44; 
Hashlen = 512;

% 获取'./DemoImages'文件夹中的所有图片文件路径
img_path = dir('./DemoImages/*');
img_path = img_path(~[img_path.isdir]);
fileList = fullfile({img_path.folder}.', {img_path.name}.');
randIndex = randi(length(fileList));
selectedImagePath = fileList{randIndex};

% 读取基准图像
I1 = imread(selectedImagePath);
% 在当前窗口中创建第一个子图，并显示基准图像
nexttile;
imshow(I1);
title('基准图');

% 初始化相似图片计数器
cnt = 0;

% 遍历文件列表中的每一张图片（从第二张开始，因为第一张是基准图）
for i = 1:length(fileList)
    I2 = imread(fileList{i});
    % 使用phash算法比较基准图I1和当前图像I2的相似度
    ds = phash(I1, I2, tau, key, Hashlen);
    
    % 如果当前图片与基准图相似，显示该图并增加计数器
    if strcmp(ds, '相似')
        cnt = cnt + 1;
        nexttile;
        imshow(I2);
        title(ds);
    end
end

% 输出相似图像的数量
disp(cnt);