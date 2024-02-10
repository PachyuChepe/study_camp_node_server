import { SOCKET } from './config/env-config.js';

async function loadDates() {
  try {
    const response = await axios.get(`${SOCKET}/get-dates`);
    const dates = response.data;
    const select = document.getElementById('dateSelect');
    dates.forEach((date) => {
      let option = document.createElement('option');
      option.value = date;
      option.text = date;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading dates:', error);
  }
}

document.getElementById('dateSelect').addEventListener('change', function () {
  const selectedDate = this.value;
  loadChartData(selectedDate);
});

async function loadChartData(date) {
  try {
    const response = await axios.get(`${SOCKET}/concurrent-users?date=${date}`);
    renderChart(response.data);
  } catch (error) {
    console.error('Error loading chart data:', error);
  }
}

let myChart; // 차트 인스턴스를 저장할 전역 변수

function renderChart(data) {
  const ctx = document.getElementById('concurrentUsersChart').getContext('2d');
  const labels = data.map((record) => new Date(record.timestamp));
  const chartData = data.map((record) => record.count);

  if (myChart) {
    // 기존 차트 인스턴스가 있으면 파괴
    myChart.destroy();
  }

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '동시접속자 수',
          data: chartData,
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          pointRadius: 0,
        },
      ],
    },
    options: {
      scales: {
        x: {
          type: 'time',
          time: {
            parser: 'HH:mm',
            unit: 'hour',
            displayFormats: {
              hour: 'HH:mm',
            },
          },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 25, // 0시부터 24시까지 1시간 간격으로 총 25개 라벨을 표시하도록 조정
          },
          min: '00:00', // X축의 시작점을 0시로 설정
          max: '24:00', // X축의 끝점을 24시로 설정
          title: {
            display: true,
            text: '시간',
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '동시접속자 수',
          },
        },
      },
    },
  });
}

window.onload = () => {
  loadDates();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('dateSelect').value = today;
  loadChartData(today);
};
