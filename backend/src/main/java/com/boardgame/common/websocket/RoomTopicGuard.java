package com.boardgame.common.websocket;

import com.boardgame.common.security.LoginMember;
import com.boardgame.room.application.RoomService;
import java.security.Principal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

// 방 토픽은 그 방의 참가자·관전자만 구독한다. 와일드카드 등 다른 /topic 구독은 모두 막는다.
// 막을 때는 예외 대신 프레임을 조용히 버린다(null). 예외는 ERROR 프레임과 함께 연결 전체를 닫을 수 있어,
// 쫓겨난 사람이 /user/queue/* 까지 잃고 재연결·재구독을 반복하게 된다.
@Component
public class RoomTopicGuard implements ChannelInterceptor {

    private static final String TOPIC_PREFIX = "/topic";
    private static final Pattern ROOM_TOPIC = Pattern.compile("^/topic/rooms/([A-Z0-9]{6})(/chat)?$");

    private final ObjectProvider<RoomService> roomService;

    public RoomTopicGuard(ObjectProvider<RoomService> roomService) {
        this.roomService = roomService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        if (!isTopicSubscription(accessor)) {
            return message;
        }
        if (!isAllowed(accessor.getDestination(), accessor.getUser())) {
            return null;
        }
        return message;
    }

    private boolean isTopicSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        return StompCommand.SUBSCRIBE.equals(accessor.getCommand())
                && destination != null && destination.startsWith(TOPIC_PREFIX);
    }

    private boolean isAllowed(String destination, Principal user) {
        Matcher matcher = ROOM_TOPIC.matcher(destination);
        if (user == null || !matcher.matches()) {
            return false;
        }
        RoomService rooms = roomService.getObject();
        return rooms.isOccupant(matcher.group(1), LoginMember.idOf(user));
    }
}
