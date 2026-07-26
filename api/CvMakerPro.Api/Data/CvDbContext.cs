using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CvMakerPro.Api.Data;

public sealed class ApplicationUser : IdentityUser;

public sealed class CvDbContext(DbContextOptions<CvDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<CvRecord> Cvs => Set<CvRecord>();

    public DbSet<CvSnapshot> Snapshots => Set<CvSnapshot>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<CvRecord>(cv =>
        {
            cv.Property(record => record.DocumentJson).HasColumnType("jsonb");
            cv.Property(record => record.Title).HasMaxLength(200);
            cv.Property(record => record.OwnerId).HasMaxLength(450);

            // Every read is "this user's CVs, newest first".
            cv.HasIndex(record => new { record.OwnerId, record.UpdatedAt });

            cv.HasMany(record => record.Snapshots)
                .WithOne()
                .HasForeignKey(snapshot => snapshot.CvId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CvSnapshot>(snapshot =>
        {
            snapshot.Property(row => row.DocumentJson).HasColumnType("jsonb");
            snapshot.HasIndex(row => new { row.CvId, row.Version }).IsUnique();
        });
    }
}
