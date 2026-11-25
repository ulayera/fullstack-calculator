package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/ulayera/fullstack-calculator/backend/internal/expression"
)

func env(values map[string]string) Lookup {
	return func(key string) (string, bool) {
		v, ok := values[key]
		return v, ok
	}
}

func TestPowerLimitDefaultsWhenUnsetOrEmpty(t *testing.T) {
	for _, values := range []map[string]string{{}, {PowerLimitVar: ""}} {
		limit, err := PowerLimit(env(values))

		require.NoError(t, err)
		assert.Equal(t, int64(expression.DefaultPowerLimit), limit)
	}
}

func TestPowerLimitReadsThePositiveInteger(t *testing.T) {
	for raw, want := range map[string]int64{"1": 1, "500": 500, "100000000": expression.MaxPowerLimit} {
		limit, err := PowerLimit(env(map[string]string{PowerLimitVar: raw}))

		require.NoError(t, err)
		assert.Equal(t, want, limit)
	}
}

func TestPowerLimitRejectsInvalidValues(t *testing.T) {
	for _, raw := range []string{"0", "-1", "1e5", "abc", "1.5", " 5", "100000001", "9223372036854775808"} {
		t.Run(raw, func(t *testing.T) {
			_, err := PowerLimit(env(map[string]string{PowerLimitVar: raw}))

			assert.EqualError(t, err, `POWER_LIMIT must be an integer from 1 to 100000000, got "`+raw+`"`)
		})
	}
}
