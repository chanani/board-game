package com.boardgame.room.api;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.error.ErrorResponse;
import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameAction;
import com.boardgame.room.application.RoomService;
import java.security.Principal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

@Controller
public class GameMessageController {

    private static final Logger log = LoggerFactory.getLogger(GameMessageController.class);

    private final RoomService roomService;

    public GameMessageController(RoomService roomService) {
        this.roomService = roomService;
    }

    @MessageMapping("/rooms/{code}/actions")
    public void act(@DestinationVariable String code, @Payload GameAction action, Principal principal) {
        roomService.act(code, LoginMember.idOf(principal), action);
    }

    @MessageMapping("/rooms/{code}/sync")
    public void sync(@DestinationVariable String code, Principal principal) {
        roomService.sync(code, LoginMember.idOf(principal));
    }

    @MessageExceptionHandler(BusinessException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public ErrorResponse handleBusiness(BusinessException exception) {
        return ErrorResponse.of(exception.errorCode());
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public ErrorResponse handleUnexpected(Exception exception) {
        log.error("STOMP 처리 중 예상하지 못한 오류", exception);
        return ErrorResponse.of(ErrorCode.INTERNAL_ERROR);
    }
}
