package com.boardgame.emote.application;

import com.boardgame.emote.api.EmoteResponse;
import com.boardgame.emote.domain.Emote;
import com.boardgame.emote.domain.EmoteRateLimiter;
import com.boardgame.room.application.OccupantContext;
import com.boardgame.room.application.RoomService;
import com.boardgame.room.domain.RoomCode;
import java.time.Clock;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

// 감정 표현은 저장하지 않고 방에 있는 사람(참가자·관전자)에게 바로 나눠 준다. 컴퓨터는 웹소켓이 없어 보내지 않는다.
@Service
public class EmoteService {

    private final RoomService roomService;
    private final EmoteRateLimiter limiter;
    private final SimpMessagingTemplate messagingTemplate;
    private final AtomicLong ids = new AtomicLong();

    public EmoteService(RoomService roomService, SimpMessagingTemplate messagingTemplate, Clock clock) {
        this.roomService = roomService;
        this.limiter = new EmoteRateLimiter(clock);
        this.messagingTemplate = messagingTemplate;
    }

    public void send(String rawCode, long memberId, String rawEmote) {
        String code = RoomCode.parse(rawCode).value();
        Emote emote = Emote.from(rawEmote);
        roomService.withOccupant(code, memberId, context -> deliver(code, memberId, emote, context));
    }

    // 방 잠금 안에서 실행된다: 방에 있는지 확인한 그 순간의 사람들에게 보낸다.
    private Void deliver(String code, long memberId, Emote emote, OccupantContext context) {
        limiter.require(memberId);
        EmoteResponse payload = EmoteResponse.of(code, ids.incrementAndGet(), memberId, emote);
        context.occupantIds().forEach(id -> messagingTemplate.convertAndSendToUser(String.valueOf(id),
                "/queue/emote", payload));
        return null;
    }
}
