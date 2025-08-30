// scroll_decorations.js

window.addEventListener('scroll', () => {
    // 获取视口的高度
    const viewportHeight = window.innerHeight;
    // 获取当前页面滚动的距离
    const scrollY = window.scrollY;

    // 获取页脚元素
    const footer = document.querySelector('footer');
    // 获取页脚顶部相对于文档顶部的距离
    const footerTop = footer.offsetTop;

    // 获取装饰图的高度
    // 假设你在 less 文件中定义了 @side-decoration-height: 250px;
    // 这里我们直接用固定值，或者通过计算获取
    const decorationHeight = 250; 

    // 计算装饰图的垂直偏移量
    // 如果页面滚动距离小于 (页脚顶部位置 - 视口高度 - 装饰图高度)，
    // 装饰图应该跟随视口移动，其位置 = 当前滚动距离
    // 否则，装饰图停在页脚上方
    let translateY = Math.min(scrollY, footerTop - viewportHeight + decorationHeight);
    
    // 如果页面滚动距离不足，则装饰图保持在页面顶部
    if (footerTop - viewportHeight + decorationHeight > scrollY) {
        translateY = scrollY;
    } else {
        // 确保装饰图停在页脚上方
        translateY = footerTop - (viewportHeight - decorationHeight) -10 ; // -10是微调
    }

    // 更新装饰图的 transform 属性
    document.body.style.setProperty('--decoration-y', `${translateY}px`);
});