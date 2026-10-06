package com.boardgame.chat.api;

import com.boardgame.chat.application.ChatService;
import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.error.ErrorResponse;
import com.boardgame.common.security.LoginMember;
import java.security.Principal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.converter.MessageConversionException;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

@Controller
public class ChatMessageController {

    private static final Logger log = LoggerFactory.getLogger(ChatMessageController.class);

    private final ChatService chatService;

    public ChatMessageController(ChatService chatService) {
        this.chatService = chatService;
    }

    @MessageMapping("/rooms/{code}/chat")
    public void send(@DestinationVariable String code, @Payload ChatSendRequest request, Principal principal) {
        chatService.send(code, LoginMember.idOf(principal), request.text());
    }

    @MessageExceptionHandler(BusinessException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public ErrorResponse handleBusiness(BusinessException exception) {
        return ErrorResponse.of(exception.errorCode());
    }

    @MessageExceptionHandler(MessageConversionException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public ErrorResponse handleMalformedPayload(MessageConversionException exception) {
        return ErrorResponse.of(ErrorCode.INVALID_INPUT);
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public ErrorResponse handleUnexpected(Exception exception) {
        log.error("STOMP 채팅 처리 중 예상하지 못한 오류", exception);
        return ErrorResponse.of(ErrorCode.INTERNAL_ERROR);
    }
}
