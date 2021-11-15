import '../../style/main.css';
/**
 * 頁面載入處理事件
 */
window.addEventListener('load', () => {
    var mymap = L.map('map').setView([25.0107036, 121.5040648], 13);

    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution:
            'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1Ijoic2FuZHlsZWUiLCJhIjoiY2t3MGR4d2RsMHh4ZzJvbm9wb3dzNG9pbCJ9.kpIV-p6GnIpY0QIVGl0Svg',
    }).addTo(mymap);

    // 標記 icon
    const marker = L.marker([25.0107036, 121.5040648])
        .addTo(mymap)
        .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
        .openPopup();
});
