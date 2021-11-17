import '../../style/main.css';
import { GetAuthorizationHeader } from '../../utils/commonApi';
import { cityList } from '../../data';

/**
 * 頁面載入處理事件
 */
window.addEventListener('load', () => {
    var mymap = L.map('map').setView([25.0107036, 121.5040648], 15);

    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution:
            'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1Ijoic2FuZHlsZWUiLCJhIjoiY2t3MGR4d2RsMHh4ZzJvbm9wb3dzNG9pbCJ9.kpIV-p6GnIpY0QIVGl0Svg',
    }).addTo(mymap);

    // navigator web api 獲取所在位置

    testClick.addEventListener('click', () => {
        geoFindMe();
    });

    function geoFindMe() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const longitude = position.coords.longitude; // 經度
                    const latitude = position.coords.latitude; // 緯度
                    console.log(longitude);
                    console.log(latitude);

                    // 重新設定 view 的位置
                    mymap.setView([latitude, longitude], 13);
                    // 將經緯度當作參數傳給 getData 執行
                    getStationData(longitude, latitude);
                },
                // 錯誤訊息
                function(e) {
                    const msg = e.code;
                    const dd = e.message;
                    console.error(msg);
                    console.error(dd);
                }
            );
        }
    }

    // 串接附近的自行車租借站位資料
    let data = [];

    function getStationData(longitude, latitude) {
        axios({
            method: 'get',
            url: `https://ptx.transportdata.tw/MOTC/v2/Bike/Station/NearBy?$spatialFilter=nearby(${latitude},${longitude},500)`,
            headers: GetAuthorizationHeader(),
        })
            .then(response => {
                console.log('租借站位資料', response);
                data = response.data;

                getAvailableData(longitude, latitude);
            })
            .catch(error => console.log('error', error));
    }
    // 串接附近的即時車位資料
    let filterData = [];

    function getAvailableData(longitude, latitude) {
        axios({
            method: 'get',
            url: `https://ptx.transportdata.tw/MOTC/v2/Bike/Availability/NearBy?$spatialFilter=nearby(${latitude},${longitude},500)`,
            headers: GetAuthorizationHeader(),
        })
            .then(response => {
                console.log('車位資料', response);
                const availableData = response.data;

                // 比對
                availableData.forEach(availableItem => {
                    data.forEach(stationItem => {
                        if (availableItem.StationUID === stationItem.StationUID) {
                            availableItem.StationName = stationItem.StationName;
                            availableItem.StationAddress = stationItem.StationAddress;
                            availableItem.StationPosition = stationItem.StationPosition;
                            filterData.push(availableItem);
                        }
                    });
                });
                console.log('filterData', filterData);
                setMarker();

                // createRouteStationCardElement();
            })
            .catch(error => console.log('error', error));
    }

    // 標記所在位置附近 Ubike 站
    function setMarker() {
        filterData.forEach(item => {
            const myIcon = L.icon({
                iconUrl: './src/image/YoubikePin.png',
            });
            L.marker([item.StationPosition.PositionLat, item.StationPosition.PositionLon], {
                icon: myIcon,
            })
                .addTo(mymap)
                .bindPopup(
                    `<div class="bike-cards">
    <div class="bike-card">
        <h2 class="card-title">${item.StationName.Zh_tw}</h2>
        <h3 class="card-subtitle">${item.StationAddress.Zh_tw}</h3>
        <h5 class="card-subtitle"><span>Youbike</span>${item.ServiceType}<span>.0</span></h5>
        <span class="card-text">可租借</span><span class="bike-numbers">${item.AvailableRentBikes}</span></br><span class="card-text">可歸還</span><span class="bike-numbers">${item.AvailableReturnBikes}</span>
        
    </div>
    </div>`
                );
        });
    }

    //車道資訊
    function creatRouteCard(item) {
        console.log(item);
        const creatRouteCardElement = document.getElementById('route-cards');
        creatRouteCardElement.innerHTML += `<div class="route-card">
                    <span class="route-title">${item.RouteName}</span>
                    <span class="route-length">全長<span class="cyclingLength">${(item.CyclingLength / 1000).toFixed(
                        2
                    )}</span>公里</span>
                    <div class="routeS2E">
                        <span class="routeStart">起點</br><span class="routeStartPlace">${
                            item.RoadSectionStart
                        }</span></span><span class="routeEnd">終點</br><span class="routeEndPlace">${
            item.RoadSectionEnd
        }</span></span>
                    </div>
                </div>
    `;
    }

    // 車道附近美食卡片
    // function createRouteStationCardElement() {
    //     createRouteStationCardElement.innerHTML = '';
    //     createStationCardElement.innerHTML = '';
    //     filterData.forEach(item => {
    //         const createRouteStationCardElement = document.getElementById('route-station-cards');

    //         createRouteStationCardElement.innerHTML += `
    //     <div class="route-station-card">
    //                 <span class="station-title">${item.StationName.Zh_tw}</span>
    //                 <div class="routeS2E">
    //                     <span class="stationBorrowText">可租借</br><span class="borrowNumbers">${filterData.AvailableRentBikes}</span></span><span class="stationCapacityText">可歸還</br><span class="capacityNumbers">${filterData.AvailableReturnBikes}</span></span>
    //                 </div>
    //             </div>
    // `;
    //     });
    // }

    // 選取道路的縣市
    const renderDataRecord = () => {
        const cityElement = document.getElementById('bikeCity');

        Object.values(cityList).forEach(element => {
            cityElement.innerHTML += `<option class="form-select-city" value="">${element}</option>`;
        });
    };

    renderDataRecord();

    const renderDefaultZone = () => {
        const cityElement = document.getElementById('bikeRoute');
        cityElement.innerHTML += `<option class="form-select" value="">請先選擇城市</option>`;
    };

    renderDefaultZone();

    // 選取自行車的路線
    const cityElement = document.getElementById('bikeCity');
    cityElement.addEventListener('change', () => {
        const selectCityIndex = cityElement.selectedIndex;
        const cityKeys = Object.keys(cityList);
        const area = cityKeys[selectCityIndex];
        console.log(area);
        console.log(`https://ptx.transportdata.tw/MOTC/v2/Cycling/Shape/` + area + `?`);
        const areaURL = `https://ptx.transportdata.tw/MOTC/v2/Cycling/Shape/` + area + `?`;
        const bikeRoute = document.querySelector('#bikeRoute');

        function getRoutesData() {
            axios({
                method: 'get',
                url: areaURL,
                headers: GetAuthorizationHeader(),
            })
                .then(response => {
                    console.log('自行車的路線', response);
                    const routeData = response.data;

                    let str = '';
                    routeData.forEach(item => {
                        str += `<option value="${item.RouteName}">${item.RouteName}</option>`;
                    });
                    bikeRoute.innerHTML = str;

                    bikeRoute.addEventListener('change', e => {
                        const value = e.target.value;
                        // console.log(value);
                        // creatRouteCard(value);

                        if (myLayer) {
                            // console.log(myLayer);
                            mymap.removeLayer('myLayer:', myLayer);
                        }

                        routeData.forEach(item => {
                            if (item.RouteName === value) {
                                const geo = item.Geometry;
                                // console.log(geo);
                                // 畫線
                                polyLine(geo);
                                creatRouteCard(item);

                                // 抓取自行車道周邊車站
                                const locationArray = item.Geometry.match(/[^MULTILINESTRING+^\(+^\+^ ),]+/g);
                                const routeLongitude = locationArray.slice(0, 1);
                                const routeLatitude = locationArray.slice(1, 2);
                                // console.log(routeLongitude);
                                // console.log(routeLatitude);
                                setMarkerOfRoute(routeLongitude, routeLatitude);
                            }
                        });
                    });
                })
                .then(response => {})
                .catch(error => console.log('error', error));
        }
        getRoutesData();
    });

    // 畫出自行車的路線 wicket 套件
    let myLayer = null;

    function polyLine(geo) {
        // 建立一個 wkt 的實體
        const wicket = new Wkt.Wkt();
        const geojsonFeature = wicket.read(geo).toJson();

        // 畫線的style
        const myStyle = {
            color: '#55B724',
            weight: 5,
            opacity: 0.65,
        };
        const myLayer = L.geoJSON(geojsonFeature, {
            style: myStyle,
        }).addTo(mymap);

        myLayer.addData(geojsonFeature);
        // zoom the map to the layer
        mymap.fitBounds(myLayer.getBounds());
    }

    // 渲染自行車道周邊車站
    function setMarkerOfRoute(routeLongitude, routeLatitude) {
        console.log('車道代表經度', routeLongitude);
        console.log('車道代表緯度', routeLatitude);
        getStationData(routeLongitude, routeLatitude);
    }
});
