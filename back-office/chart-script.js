async function loadDates() {
  try {
    const response = await axios.get(`http://localhost:3500/get-dates`);
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
    const response = await axios.get(
      `http://localhost:3500/concurrent-users?date=${date}`,
    );
    renderChart(response.data);
  } catch (error) {
    console.error('Error loading chart data:', error);
  }
}

function renderChart(data) {
  const ctx = document.getElementById('concurrentUsersChart').getContext('2d');
  const labels = data.map((record) => new Date(record.timestamp));
  const chartData = data.map((record) => record.count);

  const chart = new Chart(ctx, {
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
