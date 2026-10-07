package com.boardgame.oldmaid;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class PairChoiceTest {

    private static void assertError(List<Integer> ids, ErrorCode code) {
        assertThatThrownBy(() -> PairChoice.of(ids))
                .isInstanceOfSatisfying(BusinessException.class, error -> assertThat(error.errorCode()).isEqualTo(code));
    }

    @Test
    void 서로_다른_두_장의_번호를_받는다() {
        assertThat(PairChoice.of(List.of(4, 17))).isEqualTo(new PairChoice(new CardId(4), new CardId(17)));
    }

    @Test
    void 두_장이_아니거나_같은_번호면_INVALID_INPUT이고_없는_카드_번호면_내_손에_없는_카드다() {
        assertError(null, ErrorCode.INVALID_INPUT);
        assertError(List.of(4), ErrorCode.INVALID_INPUT);
        assertError(List.of(4, 17, 30), ErrorCode.INVALID_INPUT);
        assertError(List.of(4, 4), ErrorCode.INVALID_INPUT);
        assertError(Arrays.asList(4, null), ErrorCode.INVALID_INPUT);
        assertError(List.of(4, 53), ErrorCode.OLD_MAID_CARD_NOT_IN_HAND);
        assertError(List.of(-1, 4), ErrorCode.OLD_MAID_CARD_NOT_IN_HAND);
    }

    @Test
    void 같은_번호는_값으로_비교하고_빈_번호는_자리에_상관없이_INVALID_INPUT이다() {
        assertError(List.of(Integer.valueOf(200), Integer.valueOf(200)), ErrorCode.INVALID_INPUT);
        assertError(Arrays.asList(null, 4), ErrorCode.INVALID_INPUT);
        assertError(Arrays.asList(null, null), ErrorCode.INVALID_INPUT);
    }
}
