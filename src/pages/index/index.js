import '../../style/main.css';
import { GetAuthorizationHeader } from '../../utils/commonApi';
import { cityList } from '../../data';

let map;
const markers = [];

/**
 * 頁面載入處理事件
 */
window.addEventListener('load', () => {
    const [initialLongitude, initialLatitude] = [25.0107036, 121.5040648];
    map = L.map('map', { dragging: false, tap: false }).setView([initialLongitude, initialLatitude], 15);
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: `Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>`,
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1Ijoic2FuZHlsZWUiLCJhIjoiY2t3MGR4d2RsMHh4ZzJvbm9wb3dzNG9pbCJ9.kpIV-p6GnIpY0QIVGl0Svg',
    }).addTo(map);

    // navigator web api 獲取所在位置
    document.getElementById('testClick').addEventListener('click', () => getCurrentLocation());
    renderDataRecord();
    renderDefaultZone();

    // 選取自行車的路線
    const cityElement = document.getElementById('bikeCity');
    cityElement.addEventListener('change', () => {
        const selectCityIndex = cityElement.selectedIndex;
        const cityKeys = Object.keys(cityList);
        const area = cityKeys[selectCityIndex];
        getRoutesData(area);
    });
});

/**
 * 取得目前定位位置（經緯度）
 */
const getCurrentLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                // 取得目前定位經緯度，並重新設定 view 的位置
                const longitude = position.coords.longitude;
                const latitude = position.coords.latitude;
                map.setView([latitude, longitude], 13);
                // 將經緯度當作參數傳給 getData 執行
                getStationData(longitude, latitude);
            },
            e => {
                const errorCode = e.code;
                const errorMessage = e.message;
                console.error(errorCode);
                console.error(errorMessage);
            }
        );
    }
};

/**
 * 取得自行車路線資料
 */
const getRoutesData = area => {
    const areaURL = `https://ptx.transportdata.tw/MOTC/v2/Cycling/Shape/` + area + `?`;
    const bikeRoute = document.querySelector('#bikeRoute');

    axios({
        method: 'get',
        url: areaURL,
        headers: GetAuthorizationHeader(),
    })
        .then(response => {
            const routeData = response.data;
            let str = '<option class="form-select" value="">請先選擇城市</option>';
            routeData.forEach(item => {
                str += `<option value="${item.RouteName}">${item.RouteName}</option>`;
            });
            bikeRoute.innerHTML = str;
            bikeRoute.addEventListener('change', e => {
                const value = e.target.value;
                renderMarkerRoute(routeData, value);
            });
        })
        .then(response => {})
        .catch(error => console.log('error', error));

    const renderMarkerRoute = (routeData, locationName) => {
        routeData.forEach(item => {
            if (item.RouteName === locationName) {
                const geo = item.Geometry;
                polyLine(geo);
                createRouteCard(item);

                // 抓取自行車道周邊車站
                const locationArray = item.Geometry.match(/[^MULTILINESTRING+^\(+^\+^ ),]+/g);
                const routeLongitude = locationArray.slice(0, 1);
                const routeLatitude = locationArray.slice(1, 2);
                setMarkerOfRoute(routeLongitude, routeLatitude);
                findFoodNearbyRoute(routeLongitude, routeLatitude);
            }
        });
    };
};

// 畫出自行車的路線 wicket 套件
const polyLine = geo => {
    // 建立一個 wkt 的實體
    const wicket = new Wkt.Wkt();
    const geojsonFeature = wicket.read(geo).toJson();

    // 畫線的style
    const myStyle = {
        color: '#55B724',
        weight: 5,
        opacity: 0.65,
    };
    const mapLayer = L.geoJSON(geojsonFeature, {
        style: myStyle,
    }).addTo(map);

    mapLayer.addData(geojsonFeature);
    // zoom the map to the layer
    map.fitBounds(mapLayer.getBounds());
};

// 車道資訊
const createRouteCard = item => {
    const createRouteCardElement = document.getElementById('route-cards');
    createRouteCardElement.innerHTML = '';
    createRouteCardElement.innerHTML += `
        <div class="route-card">
            <span class="route-title">${item.RouteName}</span>
                <span class="route-length">
                    全長
                    <span class="cyclingLength">
                        ${(item.CyclingLength / 1000).toFixed(2)}
                    </span>公里
                </span>
            <div class="routeS2E">
                <span class="routeStart">起點</br>
                    <span class="routeStartPlace">
                        ${item.RoadSectionStart}
                    </span>
                </span>
                <span class="routeEnd">終點</br>
                    <span class="routeEndPlace">${item.RoadSectionEnd}</span>
                </span>
            </div>
        </div>
    `;
};

// 渲染自行車道周邊車站
const setMarkerOfRoute = (routeLongitude, routeLatitude) => {
    getStationData(routeLongitude, routeLatitude);
};

// 串接附近的自行車租借站位資料
let data = [];
const getStationData = (longitude, latitude) => {
    axios({
        method: 'get',
        url: `https://ptx.transportdata.tw/MOTC/v2/Bike/Station/NearBy?$spatialFilter=nearby(${latitude},${longitude},500)`,
        headers: GetAuthorizationHeader(),
    })
        .then(response => {
            data = response.data;
            getAvailableData(longitude, latitude);
        })
        .catch(error => console.log('error', error));
};

// 選取道路的縣市
const renderDataRecord = () => {
    const cityElement = document.getElementById('bikeCity');
    Object.values(cityList).forEach(element => {
        cityElement.innerHTML += `<option class="form-select-city" value="">${element}</option>`;
    });
};

const renderDefaultZone = () => {
    const cityElement = document.getElementById('bikeRoute');
    cityElement.innerHTML += `<option class="form-select" value="">請先選擇城市</option>`;
};

const findFoodNearbyRoute = (routeLongitude, routeLatitude) => {
    getFoodData(routeLongitude, routeLatitude);
};

// 串接附近的美食資料
const getFoodData = (longitude, latitude) => {
    const createFoodCardElement = document.getElementById('food-cards');
    const createNoFoodElement = document.getElementById('noFood');
    axios({
        method: 'get',
        url: `https://ptx.transportdata.tw/MOTC/v2/Tourism/Restaurant?$top=30&$spatialFilter=nearby(${latitude}%2C${longitude}4%2C%201000)&$format=JSON`,
        headers: GetAuthorizationHeader(),
    }).then(response => {
        createFoodCardElement.innerHTML = '';
        const foodData = response.data;
        foodData.forEach((element, index) => {
            const pictureUrl = element.Picture?.PictureUrl1 ?? `src/image/notfound.png`;
            const pictureDescription = element.Picture?.PictureDescription1 ?? `目前該餐廳沒有照片`;
            const itemData = {
                pictureUrl: pictureUrl,
                pictureDescription: pictureDescription,
                name: element.Name,
                phone: element.Phone,
                address: element.Address,
                openTime: element.OpenTime,
                index: index,
            };
            createFoodCardElement.innerHTML += createFoodCard(itemData);
        });
        createNoFoodElement.innerHTML = foodData.length === 0 ? `此站附近是美食沙漠，記得自備糧食 ᕦ(ò_óˇ)ᕤ` : '';
    });
};

// 車道附近美食卡片
const createFoodCard = itemData => {
    return `
        <div id="food-card">
            <img class="food-image" src="${itemData.pictureUrl}" alt="${itemData.pictureDescription}" />
            <span class="food-title">${itemData.name.slice(0, 12)}</span>
            <span class="food-address">
                ${itemData.address}
                <a href="https://www.google.com.tw/maps/place/${itemData.name}" target="_blank">
                    <i class="fas fa-map-pin"></i>
                </a>
            </span>
            <span class="food-phone">${itemData.phone}
                <a href="tel:${itemData.phone}">
                    <i class="fas fa-phone"></i>
                </a>
            </span>
            <span class="food-openTime">${itemData.openTime}</span>
        </div>
    `;
};

// 串接附近的即時車位資料
const getAvailableData = (longitude, latitude) => {
    axios({
        method: 'get',
        url: `https://ptx.transportdata.tw/MOTC/v2/Bike/Availability/NearBy?$spatialFilter=nearby(${latitude},${longitude},500)`,
        headers: GetAuthorizationHeader(),
    })
        .then(response => {
            const availableData = response.data;
            const filterData = [];
            clearAllMarker();

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

            filterData.map(item => {
                const markMessageHTML = `
                    <div class="bike-cards">
                        <div class="bike-card">
                            <h2 class="card-title">${item.StationName.Zh_tw}</h2>
                            <h3 class="card-subtitle">${item.StationAddress.Zh_tw}</h3>
                            <h5 class="card-subtitle"><span>Youbike</span>
                            ${item.ServiceType}
                            <span>.0</span></h5>
                            <span class="card-text">可租借</span>
                            <span class="bike-numbers">${item.AvailableRentBikes}</span>
                            </br>
                            <span class="card-text">可歸還</span>
                            <span class="bike-numbers">${item.AvailableReturnBikes}</span>
                        </div>
                    </div>
                `;
                const [latitude, longitude] = [item.StationPosition.PositionLat, item.StationPosition.PositionLon];
                setMarker({ latitude: latitude, longitude: longitude }, markMessageHTML);
            });
        })
        .catch(error => console.log('error', error));
};

// 標記所在位置附近 Ubike 站
const setMarker = ({ latitude, longitude }, message = '') => {
    const myIcon = L.icon({
        iconUrl: './src/image/YoubikePin.png',
    });
    const marker = L.marker([latitude, longitude], { icon: myIcon })
        .addTo(map)
        .bindPopup(message);
    markers.push(marker);
};

/**
 * 清除所有標記點
 */
const clearAllMarker = () => {
    markers.map(item => {
        map.removeLayer(item);
    });
};
