function[ds] = phash(I1,I2,tau,key,Hashlen)
    
    gray1 = rgb2gray(I1); 
    gray2 = rgb2gray(I2);
    
    % 重新调整图像大小为 64x64
    P1 = imresize(gray1, [64, 64]);
    P2 = imresize(gray2, [64, 64]);
    
    % 对 64x64 图像进行 8x8 子块划分，并执行 DCT
    fun = @dct2;
    Ic1 = blkproc(P1, [8 8], fun);
    Ic2 = blkproc(P2, [8 8], fun);
    
    % 将每个 8x8 块的 DC 系数 (1,1) 置 0
    Ic1(1:8:end, 1:8:end) = 0;
    Ic2(1:8:end, 1:8:end) = 0;
    
    randn('state',key) % 伪随机密钥
    hashVec1 = zeros(Hashlen, 1);
    hashVec2 = zeros(Hashlen, 1);

    % 生成 Hashlen 个 64x64 伪随机矩阵
    for n = 1:Hashlen
        
        Y = randn(64, 64); % 生成标准正态分布随机矩阵
        K = fspecial('gaussian'); % 高斯低通滤波器
        Y = filter2(K, Y); % 迭代滤波
        
        % DCT 敏感度矩阵 M（周期延拓到 64x64）
        m = [
            71.43 99.01 86.21 60.24 41.67 29.16 20.88 15.24;
            99.01 68.97 75.76 65.79 50.00 36.90 27.25 20.28;
            86.21 75.76 44.64 38.61 33.56 27.47 21.74 17.01;
            60.24 65.79 38.61 26.53 21.98 18.87 15.92 13.16;
            41.67 50.00 33.56 21.98 16.26 13.14 11.48 9.83;
            29.16 36.90 27.47 18.87 13.14 10.40 8.64 7.40;
            20.88 27.25 21.74 15.92 11.48 8.64 6.90 5.78;
            15.24 20.28 17.01 13.16 9.83 7.40 5.78 4.73
        ];
        M = repmat(m, [8 8]); % 生成 64x64 矩阵
        
        % 计算哈希值
        YN1 = sum(sum(Ic1 .* Y .* M)); 
        YN2 = sum(sum(Ic2 .* Y .* M));
        
        hashVec1(n) = YN1 > 0; % 生成 Hash 位
        hashVec2(n) = YN2 > 0;
    end
    
    % 计算汉明距离
    dis = norm((hashVec1 - hashVec2)/(2*sqrt(norm(hashVec1)*norm(hashVec2))));
    ds='';
    % 比较tau与dis
    if dis < tau
        ds='相似';
    else
        ds='不相似';
    end
end
