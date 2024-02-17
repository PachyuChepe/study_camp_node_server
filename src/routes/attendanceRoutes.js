import express from 'express';
import Attendance from '../../schemas/attendance.js';
import ConcurrentUser from '../../schemas/concurrent-users.js';
import PaymentLog from '../../schemas/payment-log.js';

const router = express.Router();

// 출석로그
router.get('/attendance/:spaceId', async (req, res) => {
  try {
    const spaceId = req.params.spaceId;
    const attendanceLogs = await Attendance.find({ spaceId: spaceId }).sort({
      entryTime: -1,
    });
    res.json(attendanceLogs);
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

// 특정 사용자의 출석로그 조회
router.get('/attendance/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const attendanceLogs = await Attendance.find({ memberId: userId }).sort({
      entryTime: -1,
    });
    res.json(attendanceLogs);
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

// 특정 날짜에 대한 동시접속자 데이터를 제공하는 라우터
router.get('/concurrent-users', async (req, res) => {
  const { date } = req.query;

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      timestamp: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    };
    const records = await ConcurrentUser.find(query).sort({ timestamp: 1 });
    res.json(records);
  } catch (error) {
    console.error('Error fetching concurrent users:', error);
    res.status(500).send(error.toString());
  }
});

// 사용 가능한 날짜 목록을 제공하는 라우터
router.get('/get-dates', async (req, res) => {
  try {
    // 'timestamp' 필드의 모든 고유 날짜를 조회합니다.
    const dates = await ConcurrentUser.distinct('timestamp').exec();

    // 날짜를 'YYYY-MM-DD' 형식으로 변환
    const formattedDates = dates.map(
      (date) => date.toISOString().split('T')[0],
    );

    // 중복 제거
    const uniqueDates = [...new Set(formattedDates)];

    res.json(uniqueDates);
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

// 특정 날짜에 대한 데이터 가져오기
router.get('/daily-data', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(startDate, endDate, '뜸?');
    const attendanceData = await Attendance.find({
      entryTime: { $gte: new Date(startDate) },
      exitTime: { $lte: new Date(endDate) },
    });

    const concurrentUserData = await ConcurrentUser.find({
      timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    // 최대 동시 접속자 수 계산
    const maxConcurrentUser = concurrentUserData.reduce(
      (max, curr) => Math.max(max, curr.count),
      0,
    );

    // 접속 시간 계산 로직
    let totalTime = 0;
    attendanceData.forEach((data) => {
      const entryTime = new Date(data.entryTime).getTime();
      const exitTime = new Date(data.exitTime).getTime();
      totalTime += exitTime - entryTime;
    });
    const maxConnectionTime = Math.max(totalTime / 3600000); // 시간 단위로 변경

    res.json({
      date: startDate, // 요청받은 시작 날짜를 반환
      maxConcurrentUser,
      maxConnectionTime,
    });
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

// 클라이언트로부터 데이터를 받아 MongoDB에 저장
router.post('/saveAttendance', async (req, res) => {
  try {
    const {
      email,
      spaceClassPaymentId,
      spaceClassPaymentName,
      spaceClassPaymentPrice,
    } = req.body; // 클라이언트에서 전달된 데이터를 추출

    // 데이터를 MongoDB에 저장
    const paymentLog = new PaymentLog({
      email,
      spaceClassPaymentId,
      spaceClassPaymentName,
      spaceClassPaymentPrice,
    });

    await paymentLog.save(); // 데이터 저장

    res.status(201).json({ message: '결제로그가 성공적으로 저장되었습니다.' });
  } catch (error) {
    console.error('결제로그 저장 오류:', error);
    res
      .status(500)
      .json({ message: '서버 오류로 데이터를 저장할 수 없습니다.' });
  }
});

// 서버 라우터에 데이터를 가져오는 엔드포인트 추가
router.get('/getPaymentLogs', async (req, res) => {
  try {
    // MongoDB에서 PaymentLog 모델의 데이터를 가져오기
    const paymentLogs = await PaymentLog.find();

    // 클라이언트에게 데이터 응답
    res.status(200).json(paymentLogs);
  } catch (error) {
    console.error('데이터를 가져오는 중 오류 발생:', error);
    res
      .status(500)
      .json({ message: '서버 오류로 데이터를 가져올 수 없습니다.' });
  }
});

// 헬스체크
router.get('/health', (req, res) => {
  res.status(200).send();
});

export default router;
