package config

import (
	"fmt"
	"strconv"

	"github.com/ulayera/fullstack-calculator/backend/internal/expression"
)

const PowerLimitVar = "POWER_LIMIT"

type Lookup func(key string) (string, bool)

func PowerLimit(lookup Lookup) (int64, error) {
	raw, ok := lookup(PowerLimitVar)
	if !ok || raw == "" {
		return expression.DefaultPowerLimit, nil
	}
	limit, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || limit <= 0 || limit > expression.MaxPowerLimit {
		return 0, fmt.Errorf("%s must be an integer from 1 to %d, got %q", PowerLimitVar, expression.MaxPowerLimit, raw)
	}
	return limit, nil
}
