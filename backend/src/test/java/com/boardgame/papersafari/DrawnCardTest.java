package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;

class DrawnCardTest {

    @Test
    void 특수_효과는_덱에서_뽑았을_때만_발동한다() {
        assertThat(new DrawnCard(Card.tarzan(), DrawSource.DECK).triggersTarzan()).isTrue();
        assertThat(new DrawnCard(Card.tarzan(), DrawSource.DISCARD).triggersTarzan()).isFalse();
        assertThat(new DrawnCard(Card.elephant(), DrawSource.DECK).triggersElephant()).isTrue();
        assertThat(new DrawnCard(Card.elephant(), DrawSource.DISCARD).triggersElephant()).isFalse();
    }

    @Test
    void 버린_더미에서_가져온_카드와_덱의_타잔은_버릴_수_없다() {
        assertError(() -> new DrawnCard(Card.number(3), DrawSource.DISCARD).validateDiscardable(),
                ErrorCode.MUST_SWAP_DISCARD_CARD);
        assertError(() -> new DrawnCard(Card.tarzan(), DrawSource.DECK).validateDiscardable(),
                ErrorCode.MUST_SWAP_TARZAN);
    }

    @Test
    void 덱에서_뽑은_일반_카드와_코끼리는_버릴_수_있다() {
        new DrawnCard(Card.number(3), DrawSource.DECK).validateDiscardable();
        new DrawnCard(Card.elephant(), DrawSource.DECK).validateDiscardable();
    }
}
