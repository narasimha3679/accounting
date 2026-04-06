package ctx

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
)

type CtxKey int

const UserKey CtxKey = 1

type Membership struct {
	ID            int64           `json:"id"`
	CompanyID     int64           `json:"company_id"`
	Role          string          `json:"role"`
	Permissions   json.RawMessage `json:"permissions"`
	IsPrimary     bool            `json:"is_primary"`
	InviteStatus  string          `json:"invite_status"`
}

type User struct {
	AppUserID        uuid.UUID
	IsEmployee       bool
	ProfileID        int64
	Email            string
	FullName         string
	Role             string
	ProfileCompanyID *int64
	Memberships      []Membership
	CompanyIDs       []int64
	CurrentCompanyID *int64
	EmployeeID       *int64
	EmployeeCompany  *int64
}

func WithUser(c context.Context, u *User) context.Context {
	return context.WithValue(c, UserKey, u)
}

func UserFrom(c context.Context) (*User, bool) {
	v, ok := c.Value(UserKey).(*User)
	return v, ok
}
