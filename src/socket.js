// src/socket.js
import Attendance from '../schemas/attendance.js';
import ConcurrentUser from '../schemas/concurrent-users.js';
import schedule from 'node-schedule';
import AllChat from '../schemas/all-chat.js';
import DirectMessage from '../schemas/direct-message.js';
import { configDotenv } from 'dotenv';
import { pubClient, subClient } from './redis/redisClient.js';
configDotenv();

export default function socket(socketIo) {
  let userMap = new Map();
  let connectedUsers = [];

  // Redis 채널 이름
  const CHANNEL = 'USER_STATE_UPDATES';
  const WEBRTC_SIGNAL_CHANNEL = 'WEBRTC_SIGNAL'; // WebRTC 시그널링을 위한 채널

  // Redis 구독 로직
  subClient.subscribe(CHANNEL, (message) => {
    const { userId, action, data } = JSON.parse(message);

    switch (action) {
      case 'update':
        // 사용자 데이터 업데이트 로직
        userMap.set(userId, data);
        if (!connectedUsers.includes(userId)) {
          connectedUsers.push(userId);
        }
        break;
      case 'disconnect':
        // 사용자 연결 해제 로직
        userMap.delete(userId);
        connectedUsers = connectedUsers.filter((id) => id !== userId);
        break;
    }

    // 서버 사이드 데이터가 업데이트 되었음을 콘솔에 로깅
    // console.log(`Data updated for user ${userId}: ${action}`);
  });

  // WebRTC 시그널링 메시지를 위한 Redis 구독
  subClient.subscribe(WEBRTC_SIGNAL_CHANNEL, (message) => {
    const signalData = JSON.parse(message);
    const { type, from, to, offer, answer, candidate } = signalData;

    // 시그널링 메시지를 적절한 소켓에 전달
    switch (type) {
      case 'offer':
        socketIo.to(to).emit('mediaOffer', { from, offer });
        break;
      case 'answer':
        socketIo.to(to).emit('mediaAnswer', { from, answer });
        break;
      case 'iceCandidate':
        socketIo.to(to).emit('remotePeerIceCandidate', { from, candidate });
        break;
      // 추가 시그널링 메시지 유형 처리...
    }
  });

  socketIo.on('connection', (socket) => {
    socket.join('outLayer');
    console.log(socket.id, 'user connected');
    //유저데이터에 memberId를 추가했다.
    const userdata = {
      id: socket.id,
      spaceId: 0,
      nickName: '닉네임',
      memberId: 0,
      userId: 0,
      x: 1,
      y: 1,
      skin: 0,
      face: 0,
      hair: 0,
      hair_color: 0,
      clothes: 0,
      clothes_color: 0,
      isSit: false,
    };

    userMap.set(socket.id, userdata);
    connectedUsers.push(socket.id);

    updateConnectedUsersCount();
    socket.on('disconnect', async () => {
      console.log(socket.id, ' user disconnected');
      const userdata = userMap.get(socket.id);
      connectedUsers = connectedUsers.filter((user) => user !== socket.id);

      if (userdata.spaceId) {
        const now = new Date(); // 현재 UTC 시간
        const koreaTimeNow = new Date(now.getTime() + 9 * 60 * 60000); // 한국 시간으로 변환

        // 사용자의 가장 최근 출석 기록을 찾음
        const lastAttendance = await Attendance.findOne({
          memberId: userdata.memberId,
          spaceId: userdata.spaceId,
        }).sort({ entryTime: -1 });

        if (lastAttendance) {
          const lastExitDate = lastAttendance.exitTime
            ? new Date(lastAttendance.exitTime)
            : null;
          const koreaTimeLastExit = lastExitDate
            ? new Date(lastExitDate.getTime() + 9 * 60 * 60000)
            : null; // 한국 시간으로 변환

          // 퇴실 시간이 같은 날짜에 속하는지 확인
          if (
            !koreaTimeLastExit ||
            (koreaTimeLastExit.getUTCDate() === koreaTimeNow.getUTCDate() &&
              koreaTimeLastExit.getUTCMonth() === koreaTimeNow.getUTCMonth() &&
              koreaTimeLastExit.getUTCFullYear() ===
                koreaTimeNow.getUTCFullYear())
          ) {
            // 동일한 날짜 내에서 연결이 끊긴 경우, 현재 시간을 퇴실 시간으로 설정
            lastAttendance.exitTime = now;
            await lastAttendance.save();
          }
        }
        socket.leave(`space ${userdata.spaceId}`);

        socketIo.sockets
          .to(`space ${userdata.spaceId}`)
          .emit('leaveSpace', userdata);

        socketIo.sockets
          .to(`space ${userdata.spaceId}`)
          .emit('disconnected', socket.id);
      }

      pubClient.publish(
        CHANNEL,
        JSON.stringify({ userId: socket.id, action: 'disconnect' }),
      );
      userMap.delete(socket.id);
      updateConnectedUsersCount();
    });

    socket.on('joinSpace', async (data) => {
      console.log('joinSpace:', data);
      const userdata = userMap.get(socket.id);
      userdata.nickName = data.nickName;
      userdata.spaceId = data.spaceId;
      userdata.memberId = data.memberId;
      userdata.userId = data.userId;
      userdata.x = data.x;
      userdata.y = data.y;
      //userdata.memberId = jwt.decode(data.accessToken).sub;
      userdata.skin = data.skin;
      userdata.face = data.face;
      userdata.hair = data.hair;
      userdata.hair_color = data.hair_color;
      userdata.clothes = data.clothes;
      userdata.clothes_color = data.clothes_color;
      userMap.set(socket.id, userdata);
      socket.join(`space ${data.spaceId}`);
      socketIo.sockets
        .to(`space ${data.spaceId}`)
        .emit('joinSpacePlayer', userdata);
      const spaceUsers = [...userMap.values()].filter(
        (user) => user.spaceId === data.spaceId,
      );

      const now = new Date(); // 현재 UTC 시간

      // 사용자의 가장 최근 출석 기록을 찾음
      const lastAttendance = await Attendance.findOne({
        memberId: userdata.memberId,
        spaceId: userdata.spaceId,
      }).sort({ entryTime: -1 });

      if (lastAttendance) {
        const lastEntryDate = new Date(lastAttendance.entryTime);

        // UTC 기준 날짜가 변경되었는지 확인
        if (
          lastEntryDate.getUTCDate() !== now.getUTCDate() ||
          lastEntryDate.getUTCMonth() !== now.getUTCMonth() ||
          lastEntryDate.getUTCFullYear() !== now.getUTCFullYear()
        ) {
          // 퇴실 시간 업데이트 (전날 23:59:59 UTC)
          lastAttendance.exitTime = new Date(
            Date.UTC(
              lastEntryDate.getUTCFullYear(),
              lastEntryDate.getUTCMonth(),
              lastEntryDate.getUTCDate(),
              23,
              59,
              59,
            ),
          );
          await lastAttendance.save();

          // 새 출석 기록 생성
          const newAttendance = new Attendance({
            spaceId: userdata.spaceId,
            memberId: userdata.memberId,
            nickName: userdata.nickName,
            entryTime: now,
          });
          await newAttendance.save();
        }
      } else {
        // 새 출석 기록 생성
        const newAttendance = new Attendance({
          spaceId: userdata.spaceId,
          memberId: userdata.memberId,
          nickName: userdata.nickName,
          entryTime: now,
        });
        await newAttendance.save();
      }
      // Redis에 사용자 상태 업데이트 발행
      const userData = await { ...userdata }; // 사용자 데이터를 복사
      pubClient.publish(
        CHANNEL,
        JSON.stringify({ userId: socket.id, action: 'update', data: userData }),
      );

      socket.emit('spaceUsers', spaceUsers);
    });

    socket.on('leave', (data) => {
      const userdata = userMap.get(data.id);
      socketIo.sockets
        .to(`space ${userdata.spaceId}`)
        .emit('leaveSpace', userdata);
      socket.leave(`space ${userdata.spaceId}`);
      userdata.spaceId = 0;
      userMap.set(data.id, userdata);
    });

    socket.on('move', (data) => {
      const userdata = userMap.get(data.id);
      userdata.x = data.x;
      userdata.y = data.y;
      userMap.set(data.id, userdata);
      socketIo.sockets
        .to(`space ${userdata.spaceId}`)
        .emit('movePlayer', userdata);

      // Redis에 사용자 상태 업데이트 발행
      pubClient.publish(
        CHANNEL,
        JSON.stringify({ userId: data.id, action: 'update', data: userdata }),
      );
    });

    socket.on('sit', (data) => {
      const userdata = userMap.get(data.id);
      userdata.isSit = data.isSit;
      userMap.set(data.id, userdata);
      socketIo.sockets
        .to(`space ${userdata.spaceId}`)
        .emit('sitPlayer', userdata);
    });

    socket.on('updateSkin', (data) => {
      const userdata = userMap.get(data.id);
      userdata.skin = data.skin;
      userdata.face = data.face;
      userdata.hair = data.hair;
      userdata.hair_color = data.hair_color;
      userdata.clothes = data.clothes;
      userdata.clothes_color = data.clothes_color;
      userMap.set(data.id, userdata);
      socketIo.sockets
        .to(`space ${userdata.spaceId}`)
        .emit('updateSkinPlayer', userdata);
    });

    socket.on('chat', (data) => {
      // id, message
      socketIo.sockets.to(`space ${userdata.spaceId}`).emit('chatPlayer', {
        id: socket.id,
        nickName: data.nickName,
        message: data.message,
      });
      //유저 맵 출력해서 값 확인
      // console.log('usermap in allchat:', userMap.get(data.id));
      AllChat.create({
        nick_name: data.nickName,
        message: data.message,
        member_id: userMap.get(data.id).memberId,

        space_id: data.spaceId,
      });
    });
    //특정 플레이어에게 메세지를 보내야한다.
    socket.on('directMessageToPlayer', (data) => {
      socketIo.sockets.to(data.getterId).emit('directMessage', {
        senderId: data.senderId,
        message: data.message,
      });

      //TODO getter_id
      DirectMessage.create({
        sender_id: userMap.get(data.senderId).memberId,
        getter_id: userMap.get(data.getterId).memberId,
        message: data.message,
        getter_nick: data.getterNickName,
        sender_nick: data.senderNickName,
      });
    });

    socket.on('groupChat', (data) => {
      for (let room of socket.rooms) {
        //모든 Room을 끊는다. 이건 매우 위험한 짓이다. 하지만 이렇게 해야 한다.
        //나중에 문제가 되면 if문에 조건을 더 걸자.
        if (room !== socket.id && !room.includes('space')) {
          socket.leave(room);
        }
      }

      socket.join(data.room);
      socketIo.sockets.to(data.room).emit('chatInGroup', {
        message: data.message,
        senderSocketId: data.senderId,
        senderNickName: data.nickName,
      });
    });

    // wecRTC
    socket.on('requestUserList', (data) => {
      console.log('[서버] 유저 정보 요청 받음', data);
      const spaceUsers = [...userMap.values()]
        .filter((user) => user.spaceId === data.spaceId)
        .map((user) => user.id);
      console.log('[서버] 유저 리스트 업데이트!', spaceUsers);
      socket.emit('update-user-list', { userIds: spaceUsers });
      socket.broadcast.emit('update-user-list', { userIds: spaceUsers });
    });

    socket.on('mediaOffer', (data) => {
      // console.log('[서버] offer 받음 ');
      // socket.to(data.to).emit('mediaOffer', {
      //   from: data.from,
      //   offer: data.offer,
      // });

      const signalData = {
        type: 'offer',
        from: data.from,
        to: data.to,
        offer: data.offer,
      };

      // Redis를 통해 시그널링 데이터 전송
      pubClient.publish(WEBRTC_SIGNAL_CHANNEL, JSON.stringify(signalData));
    });

    socket.on('mediaAnswer', (data) => {
      // console.log('[서버] answer 받음');
      // socket.to(data.to).emit('mediaAnswer', {
      //   from: data.from,
      //   answer: data.answer,
      // });

      const signalData = {
        type: 'answer',
        from: data.from,
        to: data.to,
        answer: data.answer,
      };

      pubClient.publish(WEBRTC_SIGNAL_CHANNEL, JSON.stringify(signalData));
    });

    socket.on('iceCandidate', (data) => {
      // socket.to(data.to).emit('remotePeerIceCandidate', {
      //   from: data.from,
      //   candidate: data.candidate,
      // });

      const signalData = {
        type: 'iceCandidate',
        from: data.from,
        to: data.to,
        candidate: data.candidate,
      };

      pubClient.publish(WEBRTC_SIGNAL_CHANNEL, JSON.stringify(signalData));
    });

    socket.on('AllChatHistory', async (data) => {
      try {
        console.log('AllChatHistory data=>', data);
        const socketId = socket.id;
        const spaceId = data.spaceId;
        const chats = await AllChat.find({ space_id: spaceId }).sort({
          createdAt: 1,
        });
        console.log('Chats:', chats);
        console.log('socketId', socketId);
        await socketIo.sockets.to(socketId).emit('AllChatHistory', { chats });
      } catch (err) {
        console.error('AllChatHistory Error:', err);
      }
    });

    socket.on('AllDMHistory', async (data) => {
      try {
        console.log('AllDMHistory data=>', data);
        const socketId = socket.id;
        const memberId = data.memberId;
        const directMessages = await DirectMessage.find({
          $or: [{ sender_id: memberId }, { getter_id: memberId }],
        });
        await socketIo.sockets
          .to(socketId)
          .emit('AllDMHistory', { directMessages });
      } catch (err) {
        console.error('AllDMHistory Error:', err);
      }
    });
  });

  // 1분 간격으로 동시접속자 수를 데이터베이스에 저장
  schedule.scheduleJob('*/1 * * * *', function () {
    const concurrentUsersRecord = new ConcurrentUser({
      count: connectedUsers.length,
    });
    concurrentUsersRecord
      .save()
      .then(() =>
        console.log(
          `Saved ${connectedUsers.length} concurrent users at ${new Date().toISOString()}`,
        ),
      )
      .catch((err) => console.error(err));
  });

  // 연결된 사용자 수를 업데이트하는 함수
  function updateConnectedUsersCount() {
    // connectedUsers 배열의 길이를 사용하여 현재 연결된 사용자 수를 설정
    console.log(`Current connected users: ${connectedUsers.length}`);
  }
}
