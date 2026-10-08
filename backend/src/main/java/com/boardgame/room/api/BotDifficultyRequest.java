package com.boardgame.room.api;

// R8·R10: 컴퓨터 추가·난이도 바꾸기 본문. difficulty = "EASY" | "MEDIUM" | "HARD".
public record BotDifficultyRequest(String difficulty) {
}
