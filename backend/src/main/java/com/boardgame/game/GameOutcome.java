package com.boardgame.game;

public sealed interface GameOutcome permits RoundCompleted, GameCompleted {
}
