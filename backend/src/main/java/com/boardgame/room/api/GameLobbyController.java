package com.boardgame.room.api;

import com.boardgame.room.application.RoomService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/games")
public class GameLobbyController {

    private final RoomService roomService;

    public GameLobbyController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping
    public List<GameSummaryResponse> games() {
        return roomService.gameOccupancies();
    }
}
