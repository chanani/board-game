package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.B;
import static com.boardgame.oldmaid.OldMaidFixtures.C;
import static com.boardgame.oldmaid.OldMaidFixtures.D;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class StandingsTest {

    @Test
    void R30_끝낸_순서_다음_도둑_다음_늦게_나간_기권자() {
        Standings standings = new Standings();
        standings.forfeit(D);
        assertThat(standings.finish(B)).isEqualTo(new FinishRank(1));
        standings.forfeit(C);

        Ranking ranking = standings.rank(A);

        assertThat(ranking.entries()).containsExactly(
                new RankedPlayer(B, new FinishRank(1), Placement.FINISHED),
                new RankedPlayer(A, new FinishRank(2), Placement.THIEF),
                new RankedPlayer(C, new FinishRank(3), Placement.FORFEITED),
                new RankedPlayer(D, new FinishRank(4), Placement.FORFEITED));
        assertThat(ranking.winner().player()).isEqualTo(B);
        assertThat(ranking.thief()).contains(A);
        assertThat(ranking.lastHolder().player()).isEqualTo(A);
        assertThat(ranking.rankOf(D)).isEqualTo(new FinishRank(4));
    }

    @Test
    void R31_모두_기권해_혼자_남으면_도둑이_아니라_남은_승자_1등이다() {
        Standings standings = new Standings();
        standings.forfeit(B);

        Ranking ranking = standings.rank(A);

        assertThat(ranking.winner()).isEqualTo(new RankedPlayer(A, new FinishRank(1), Placement.LAST_STANDING));
        assertThat(ranking.thief()).isEmpty();
        assertThat(standings.isOut(B)).isTrue();
        assertThat(standings.hasForfeited(B)).isTrue();
        assertThat(standings.rankOf(B)).isEmpty();
    }
}
