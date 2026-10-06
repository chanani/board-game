package com.boardgame.uno;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Optional;

public class ChallengeState {

    private FourCharge charge;
    private ChallengeReveal reveal;

    public void charge(FourCharge next) {
        charge = next;
    }

    public Optional<FourCharge> pending() {
        return Optional.ofNullable(charge);
    }

    public FourCharge take() {
        FourCharge taken = pending().orElseThrow(() -> new BusinessException(ErrorCode.INVALID_PHASE));
        charge = null;
        return taken;
    }

    public void clear() {
        charge = null;
    }

    public void reveal(ChallengeReveal next) {
        reveal = next;
    }

    public Optional<ChallengeReveal> revealFor(PlayerId viewer) {
        return Optional.ofNullable(reveal)
                .filter(shown -> shown.isFor(viewer));
    }

    public void forgetReveal() {
        reveal = null;
    }
}
