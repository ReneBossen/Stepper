using FluentAssertions;
using Stepper.Api.Friends.Discovery;

namespace Stepper.UnitTests.Friends.Discovery;

public class InviteCodeTests
{
    #region IsValid Tests

    [Fact]
    public void IsValid_WithNoExpiration_AndNoMaxUsages_ReturnsTrue()
    {
        // Arrange
        var inviteCode = new InviteCode
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Code = "test-code",
            Type = InviteCodeType.ShareLink,
            ExpiresAt = null,
            MaxUsages = null,
            UsageCount = 0,
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = inviteCode.IsValid();

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsValid_WithFutureExpiration_ReturnsTrue()
    {
        // Arrange
        var inviteCode = new InviteCode
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Code = "test-code",
            Type = InviteCodeType.ShareLink,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            MaxUsages = null,
            UsageCount = 0,
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = inviteCode.IsValid();

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsValid_WithPastExpiration_ReturnsFalse()
    {
        // Arrange
        var inviteCode = new InviteCode
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Code = "test-code",
            Type = InviteCodeType.ShareLink,
            ExpiresAt = DateTime.UtcNow.AddHours(-1),
            MaxUsages = null,
            UsageCount = 0,
            CreatedAt = DateTime.UtcNow.AddHours(-2)
        };

        // Act
        var result = inviteCode.IsValid();

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsValid_WithUsageBelowMaxUsages_ReturnsTrue()
    {
        // Arrange
        var inviteCode = new InviteCode
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Code = "test-code",
            Type = InviteCodeType.ShareLink,
            ExpiresAt = null,
            MaxUsages = 5,
            UsageCount = 3,
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = inviteCode.IsValid();

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsValid_WithUsageEqualToMaxUsages_ReturnsFalse()
    {
        // Arrange
        var inviteCode = new InviteCode
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Code = "test-code",
            Type = InviteCodeType.ShareLink,
            ExpiresAt = null,
            MaxUsages = 5,
            UsageCount = 5,
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = inviteCode.IsValid();

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsValid_WithUsageAboveMaxUsages_ReturnsFalse()
    {
        // Arrange
        var inviteCode = new InviteCode
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Code = "test-code",
            Type = InviteCodeType.ShareLink,
            ExpiresAt = null,
            MaxUsages = 5,
            UsageCount = 6,
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = inviteCode.IsValid();

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsValid_WithExpiredAndMaxUsagesReached_ReturnsFalse()
    {
        // Arrange
        var inviteCode = new InviteCode
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Code = "test-code",
            Type = InviteCodeType.ShareLink,
            ExpiresAt = DateTime.UtcNow.AddHours(-1),
            MaxUsages = 5,
            UsageCount = 5,
            CreatedAt = DateTime.UtcNow.AddHours(-2)
        };

        // Act
        var result = inviteCode.IsValid();

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsValid_QrCodeType_WithNoExpiration_ReturnsTrue()
    {
        // Arrange
        var inviteCode = new InviteCode
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Code = "qr-code-123",
            Type = InviteCodeType.QrCode,
            ExpiresAt = null,
            MaxUsages = null,
            UsageCount = 0,
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = inviteCode.IsValid();

        // Assert
        result.Should().BeTrue();
    }

    #endregion
}
