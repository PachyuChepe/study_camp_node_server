import { SOCKET } from './config/env-config.js';

// paymentRecordsModal.js
export default class PaymentRecordsModal {
  constructor() {
    this.initModal();
    this.createDate();
    // this.createList();
    this.initEventListeners();
  }

  initModal() {
    this.modal = document.createElement('div');
    this.modal.classList.add('modal');
    this.setStyle(this.modal, {
      width: '60%',
      maxWidth: '640px',
      minHeight: '300px',
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#FFF',
      boxShadow: '0px 8px 36px #aaa',
      borderRadius: '10px',
      display: 'none',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: '1050',
    });
    document.body.appendChild(this.modal);

    const closeButton = document.createElement('span');
    closeButton.classList.add('modal-close');
    closeButton.innerHTML = '&times;';
    closeButton.onclick = this.closeModal.bind(this);
    this.setStyle(closeButton, {
      cursor: 'pointer',
      position: 'absolute',
      top: '10px',
      right: '20px',
      fontSize: '25px',
      color: '#333',
    });
    this.modal.appendChild(closeButton);

    const modalHeader = document.createElement('div');
    modalHeader.classList.add('modal-header');
    modalHeader.innerText = '결제 목록';
    this.setStyle(modalHeader, {
      padding: '15px',
      fontSize: '20px',
      backgroundColor: '#6758FF',
      color: 'white',
      textAlign: 'center',
      width: '100%',
      boxSizing: 'border-box',
    });
    this.modal.appendChild(modalHeader);

    this.select = document.createElement('select');
    this.setStyle(this.select, {
      width: 'calc(100% - 40px)',
      padding: '10px',
      margin: '20px',
      border: '1px solid #ccc',
      borderRadius: '5px',
    });
    this.select.style.display = 'none'; // <select> 태그 숨기기
    this.modal.appendChild(this.select);

    this.container = document.createElement('div');
    this.setStyle(this.container, {
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    });
    this.modal.appendChild(this.container);

    this.headContainer = document.createElement('div');
    this.setStyle(this.headContainer, {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '10px',
      width: '100%',
    });

    ['시간', '유저 아이디', '가격', '비고'].forEach((header) => {
      const headerDiv = document.createElement('div');
      headerDiv.innerText = header;
      this.setStyle(headerDiv, {
        fontWeight: 'bold',
        textAlign: 'center',
      });
      this.headContainer.appendChild(headerDiv);
    });
    this.container.appendChild(this.headContainer);

    this.listContainer = document.createElement('div');
    this.setStyle(this.listContainer, {
      width: '100%',
      maxHeight: '400px',
      overflowY: 'auto',
    });
    this.container.appendChild(this.listContainer);
  }

  setStyle(element, styles) {
    Object.keys(styles).forEach((key) => {
      element.style[key] = styles[key];
    });
  }

  openModal() {
    this.modal.style.display = 'flex';
  }

  closeModal() {
    this.modal.style.display = 'none';
  }

  createDate() {
    // Add options to the select element
    ['2024-01-01', '2024-01-02', '2024-01-03'].forEach((date, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = date;
      this.select.appendChild(option);
    });
  }

  // paymentRecordsModal.js의 createList 함수 수정
  createList() {
    axios
      .get(`${SOCKET}/getPaymentLogs`)
      .then((response) => {
        const paymentLogs = response.data;
        this.listContainer.innerHTML = ''; // 리스트 초기화

        paymentLogs.forEach((log) => {
          const listItem = document.createElement('div');
          this.setStyle(listItem, {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            padding: '10px',
            borderBottom: '1px solid #ccc',
          });

          // 시간을 '년-월-일' 형식으로 변환
          const date = new Date(log.createdAt);
          const formattedDate = date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          console.log(formattedDate, 'formattedDate');
          const info = [
            formattedDate,
            log.email,
            log.spaceClassPaymentPrice,
            'Details',
          ];

          info.forEach((text) => {
            const item = document.createElement('div');
            item.textContent = text;
            this.setStyle(item, {
              textAlign: 'center', // 텍스트를 중앙으로 정렬
            });
            listItem.appendChild(item);
          });

          this.listContainer.appendChild(listItem);
        });
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
      });
  }

  initEventListeners() {
    document
      .getElementById('paymentListButton')
      .addEventListener('click', () => {
        this.createList(); // 버튼 클릭 시 createList 메소드 호출
      });
  }
}
