package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class BoardTest {

    private final List<Card> hand = List.of(
            Card.number(3), Card.number(7), Card.fox(),
            Card.number(5), Card.number(7), Card.fox());

    @Test
    void 위치는_행_우선_순서로_6칸이다() {
        assertThat(Position.all()).containsExactly(
                new Position(0, 0), new Position(1, 0), new Position(2, 0),
                new Position(0, 1), new Position(1, 1), new Position(2, 1));
    }

    @Test
    void 판_밖의_위치는_만들_수_없다() {
        assertError(() -> new Position(3, 0), ErrorCode.INVALID_POSITION);
        assertError(() -> new Position(0, 2), ErrorCode.INVALID_POSITION);
        assertError(() -> new Position(-1, 0), ErrorCode.INVALID_POSITION);
    }

    @Test
    void 받은_카드는_윗줄부터_뒷면으로_놓인다() {
        Board board = Board.deal(hand);

        assertThat(board.cardAt(Position.top(0))).isEqualTo(Card.number(3));
        assertThat(board.cardAt(Position.bottom(0))).isEqualTo(Card.number(5));
        assertThat(board.hasFaceUp()).isFalse();
        assertThat(board.isFaceDown(Position.top(0))).isTrue();
    }

    @Test
    void 뒤집으면_앞면이_된다() {
        Board board = Board.deal(hand);

        board.reveal(Position.top(1));

        assertThat(board.isFaceDown(Position.top(1))).isFalse();
        assertThat(board.hasFaceUp()).isTrue();
    }

    @Test
    void 교체하면_이전_카드를_돌려주고_새_카드는_앞면이다() {
        Board board = Board.deal(hand);

        Card previous = board.replace(Position.bottom(2), Card.number(0));

        assertThat(previous).isEqualTo(Card.fox());
        assertThat(board.cardAt(Position.bottom(2))).isEqualTo(Card.number(0));
        assertThat(board.isFaceDown(Position.bottom(2))).isFalse();
    }

    @Test
    void 모두_뒤집으면_전부_공개_상태다() {
        Board board = Board.deal(hand);

        board.revealAll();

        assertThat(board.allFaceUp()).isTrue();
        assertThat(board.hasFaceDown()).isFalse();
    }

    @Test
    void 판_점수는_세_열_점수의_합이다() {
        Board board = Board.deal(hand);

        assertThat(board.score()).isEqualTo(new Score(8));
    }
}
