/**
 * 頁面載入處理事件
 */
window.addEventListener('load', () => {
    console.log('master page');
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    console.log(params);
});
