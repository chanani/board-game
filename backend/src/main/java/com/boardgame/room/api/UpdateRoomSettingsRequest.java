package com.boardgame.room.api;

public record UpdateRoomSettingsRequest(Integer maxPlayers, String theme) {
}
