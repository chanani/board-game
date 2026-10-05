package com.boardgame.papersafari;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TokensTest {

    private final PlayerId a = new PlayerId(1L);
    private final PlayerId b = new PlayerId(2L);

    @Test
    void 토큰을_받으면_하나씩_늘어난다() {
        Tokens tokens = Tokens.forPlayers(Seats.of(List.of(a, b)));

        tokens.award(a);
        tokens.award(a);

        assertThat(tokens.countOf(a)).isEqualTo(new TokenCount(2));
        assertThat(tokens.countOf(b)).isEqualTo(TokenCount.ZERO);
        assertThat(tokens.champion()).isEmpty();
    }

    @Test
    void 토큰_3개를_모으면_챔피언이다() {
        Tokens tokens = Tokens.forPlayers(Seats.of(List.of(a, b)));

        tokens.award(b);
        tokens.award(b);
        tokens.award(b);

        assertThat(tokens.champion()).contains(b);
        assertThat(tokens.toView()).isEqualTo(Map.of(1L, 0, 2L, 3));
    }
}
