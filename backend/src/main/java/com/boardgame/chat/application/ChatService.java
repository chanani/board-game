package com.boardgame.chat.application;

import com.boardgame.chat.api.ChatMessageResponse;
import com.boardgame.chat.domain.ChatAuthor;
import com.boardgame.chat.domain.ChatBody;
import com.boardgame.chat.domain.ChatMessage;
import com.boardgame.chat.domain.ChatRateLimiter;
import com.boardgame.chat.domain.ChatText;
import com.boardgame.chat.infra.ChatRegistry;
import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.room.application.RoomService;
import com.boardgame.room.domain.RoomClosedEvent;
import com.boardgame.room.domain.RoomCode;
import java.time.Clock;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

// RoomService의 잠금 안에서 방 닫힘 이벤트가 오므로, 이 서비스는 자체 잠금을 잡지 않는다.
@Service
public class ChatService {

    private final RoomService roomService;
    private final ChatRegistry registry;
    private final ChatRateLimiter limiter;
    private final SimpMessagingTemplate messagingTemplate;
    private final Clock clock;
    private final AtomicLong ids = new AtomicLong();

    public ChatService(RoomService roomService, ChatRegistry registry, SimpMessagingTemplate messagingTemplate,
                       Clock clock) {
        this.roomService = roomService;
        this.registry = registry;
        this.limiter = new ChatRateLimiter(clock);
        this.messagingTemplate = messagingTemplate;
        this.clock = clock;
    }

    public void send(String code, long memberId, String rawText) {
        String nickname = roomService.nicknameOf(code, memberId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_IN_ROOM));
        ChatText text = new ChatText(rawText);
        limiter.require(memberId);
        ChatMessage message = new ChatMessage(ids.incrementAndGet(), new ChatAuthor(memberId, nickname),
                new ChatBody(text, clock.instant()));
        registry.logOf(RoomCode.parse(code).value()).append(message);
        messagingTemplate.convertAndSend("/topic/rooms/" + RoomCode.parse(code).value() + "/chat",
                ChatMessageResponse.from(message));
    }

    public List<ChatMessage> history(String code, long memberId) {
        if (!roomService.isOccupant(code, memberId)) {
            throw new BusinessException(ErrorCode.NOT_IN_ROOM);
        }
        return registry.logOf(RoomCode.parse(code).value()).asList();
    }

    public void clear(String code) {
        registry.remove(code);
    }

    @EventListener
    public void onRoomClosed(RoomClosedEvent event) {
        clear(event.code());
    }
}
