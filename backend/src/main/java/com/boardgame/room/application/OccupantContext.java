package com.boardgame.room.application;

import java.util.List;

public record OccupantContext(String nickname, List<Long> occupantIds, boolean spectator) {
}
