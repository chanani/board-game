package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.LinkedHashMap;
import java.util.Map;

public class PlayerBoards {

    private final Map<PlayerId, Board> boards;
    private final KnownCards knownCards;

    private PlayerBoards(Map<PlayerId, Board> boards, KnownCards knownCards) {
        this.boards = boards;
        this.knownCards = knownCards;
    }

    public static PlayerBoards deal(Seats seats, Table table) {
        Map<PlayerId, Board> boards = new LinkedHashMap<>();
        seats.asList().forEach(player -> boards.put(player, Board.deal(table.dealHand())));
        return new PlayerBoards(boards, new KnownCards());
    }

    public void flipInitial(PlayerId player, Position position) {
        Board board = boardOf(player);
        if (board.hasFaceUp()) {
            throw new BusinessException(ErrorCode.ALREADY_FLIPPED);
        }
        board.reveal(position);
    }

    public boolean everyoneFlipped() {
        return boards.values().stream().allMatch(Board::hasFaceUp);
    }

    public Card replace(PlayerId player, Position position, Card card) {
        knownCards.forget(player, position);
        return boardOf(player).replace(position, card);
    }

    public void peek(PlayerId player, Position position) {
        if (!boardOf(player).isFaceDown(position)) {
            throw new BusinessException(ErrorCode.NOT_FACE_DOWN);
        }
        knownCards.remember(player, position);
    }

    public boolean knows(PlayerId player, Position position) {
        return knownCards.knows(player, position);
    }

    public boolean hasFaceDown(PlayerId player) {
        return boardOf(player).hasFaceDown();
    }

    public boolean anyAllFaceUp() {
        return boards.values().stream().anyMatch(Board::allFaceUp);
    }

    public void revealAll() {
        boards.values().forEach(Board::revealAll);
    }

    public Map<PlayerId, Score> scores() {
        Map<PlayerId, Score> scores = new LinkedHashMap<>();
        boards.forEach((player, board) -> scores.put(player, board.score()));
        return scores;
    }

    public void remove(PlayerId player) {
        boards.remove(player);
    }

    public Board boardOf(PlayerId player) {
        Board board = boards.get(player);
        if (board == null) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        return board;
    }
}
